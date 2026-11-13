"""Interactive ES8311 tone output for the Pulsar C5 browser workbench.

Install es8311.py first. Wire the codec for PLAYBACK with USB unplugged:
  BCLK -> J20 GPIO27, WS -> J20 GPIO7, DIN -> J20 GPIO26,
  MCLK -> J20 GPIO10, SDA -> QWIIC GPIO1, SCL -> QWIIC GPIO6,
  3V3 -> 3V3, GND -> GND; connect a speaker to the codec output.

Run this script from the Code view, then open the tone panel. It accepts lines:
  T <frequency 110..1760> <sine|triangle|square|saw> <level 0..75>
  STOP
  PING
While a tone plays it also prints "TONE,LOAD,<max us>,<budget us>" every 1.5 s:
the time spent making one block against the time one block lasts. If the first
number is close to or above the second, the audio stutters and sounds quiet.
Ctrl+C closes I2S. Level is software amplitude (all waves equally loud); codec volume is 0.7.
The level glides to its target inside every block, so notes start and stop
without clicks, and the phase carries over when only the pitch changes.
"""

import array
import math
import select
import sys
import time

import es8311

SDA_PIN = 1         # QWIIC SDA
SCL_PIN = 6         # QWIIC SCL
BCLK_PIN = 27       # J20: ES8311 SCLK/BCLK
WS_PIN = 7          # J20: ES8311 LRCK/WS
DIN_PIN = 26        # J20: Pulsar C5 output -> ES8311 SDIN (speaker)
MCLK_PIN = 10       # J20: ES8311 MCLK (256 x fs); keep it, the codec sounds best with it

SAMPLE_RATE = 22050   # same rate as es8311_melody.py
CODEC_VOLUME = 0.7
TABLE_SIZE = 256
PHASE_SCALE = 65536
FRAMES = 256

# Every wave is scaled to the same RMS (about -6 dBFS at level 100), so switching
# waveform changes the timbre, not the loudness. A sine of equal peak would be
# the quietest of the four, and small speakers play low sines poorly.
TARGET_RMS = 17000
SINE = array.array("h", [int(TARGET_RMS * 2 ** 0.5 * math.sin(2 * math.pi * i / TABLE_SIZE))
                         for i in range(TABLE_SIZE)])
TRIANGLE = array.array("h", [int(TARGET_RMS * 3 ** 0.5 * (1 - 4 * abs(i / TABLE_SIZE - 0.5)))
                             for i in range(TABLE_SIZE)])
SQUARE = array.array("h", [TARGET_RMS if i < TABLE_SIZE // 2 else -TARGET_RMS
                           for i in range(TABLE_SIZE)])
SAW = array.array("h", [int(TARGET_RMS * 3 ** 0.5 * (2 * i / TABLE_SIZE - 1)) for i in range(TABLE_SIZE)])
WAVES = {"sine": SINE, "triangle": TRIANGLE, "square": SQUARE, "saw": SAW}


_RENDER_SRC = """
@micropython.viper
def render(buf: ptr16, table: ptr16, frames: int, phase: int, step: int, cur: int, tgt: int) -> int:
    for i in range(frames):
        heard = cur + (tgt - cur) * (i + 1) // frames
        v = int(table[(phase >> 16) & 255])
        if v & 0x8000:
            v -= 0x10000
        s = v * heard // 100
        buf[2 * i] = s
        buf[2 * i + 1] = s
        phase = (phase + step) & 0xFFFFFF
    return phase
"""


def _render_py(buf, table, frames, phase, step, cur, tgt):
    span = TABLE_SIZE * PHASE_SCALE
    for i in range(frames):
        heard = cur + (tgt - cur) * (i + 1) // frames
        s = table[(phase // PHASE_SCALE) % TABLE_SIZE] * heard // 100
        buf[2 * i] = s
        buf[2 * i + 1] = s
        phase = (phase + step) % span
    return phase


try:
    _ns = {}
    exec(_RENDER_SRC, _ns)
    render = _ns["render"]
    NATIVE = True
except Exception:  # firmware without the native emitter: slower, may stutter
    render = _render_py
    NATIVE = False


def main():
    audio = es8311.ES8311Audio(sda=SDA_PIN, scl=SCL_PIN, mclk=MCLK_PIN,
                               bclk=BCLK_PIN, ws=WS_PIN, data_out=DIN_PIN)
    audio.begin_tx(rate=SAMPLE_RATE, volume=CODEC_VOLUME, ibuf=4096)
    poller = select.poll()
    poller.register(sys.stdin, select.POLLIN)
    pcm = array.array("h", [0] * (FRAMES * 2))
    line = ""
    frequency = 0
    level = 0
    current = 0  # level actually heard: glides toward `level`
    wave = "sine"
    phase = 0
    last_ready = time.ticks_ms()
    worst = 0
    budget = FRAMES * 1000000 // SAMPLE_RATE

    print("TONE,READY")
    try:
        while True:
            while poller.poll(0):
                char = sys.stdin.read(1)
                if char == "\r" or char == "\n":
                    if not line:
                        continue
                    parts = line.split()
                    line = ""
                    if parts[0] == "PING" and len(parts) == 1:
                        print("TONE,READY")
                    elif parts[0] == "STOP" and len(parts) == 1:
                        level = 0  # glide to silence, then idle
                        print("TONE,STOP")
                    elif parts[0] == "T" and len(parts) == 4:
                        try:
                            next_frequency = int(parts[1])
                            next_wave = parts[2]
                            next_level = int(parts[3])
                            if not 110 <= next_frequency <= 1760 or next_wave not in WAVES or not 0 <= next_level <= 75:
                                raise ValueError("range")
                            frequency = next_frequency
                            wave = next_wave
                            level = next_level
                            print("TONE,PLAY,%d,%s,%d" % (frequency, wave, level))
                        except ValueError:
                            print("TONE,ERROR,range")
                    else:
                        print("TONE,ERROR,command")
                elif char and len(line) < 64:
                    line += char

            now = time.ticks_ms()
            if time.ticks_diff(now, last_ready) >= 1500:
                print("TONE,READY")
                if worst:
                    print("TONE,LOAD,%d,%d%s" % (worst, budget, "" if NATIVE else ",slow"))
                worst = 0
                last_ready = now

            target = level if frequency else 0
            if not target and not current:
                poller.poll(50)
                continue

            step = frequency * TABLE_SIZE * PHASE_SCALE // SAMPLE_RATE
            started = time.ticks_us()
            phase = render(pcm, WAVES[wave], FRAMES, phase, step, current, target)
            worst = max(worst, time.ticks_diff(time.ticks_us(), started))
            current = target
            audio.write(pcm)
    finally:
        audio.end()


main()
