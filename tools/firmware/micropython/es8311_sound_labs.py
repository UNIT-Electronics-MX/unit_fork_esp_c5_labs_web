"""Sound exercises for the ES8311 codec. Install es8311.py first.

Shared wiring: SDA=Qwiic GPIO1, SCL=Qwiic GPIO6, BCLK=J20 GPIO27,
WS=J20 GPIO7, MCLK=J20 GPIO10. For input connect codec DOUT to D6/GPIO24
and an analog microphone to the codec J2 input. For output connect codec
DIN to J20 GPIO26 and a speaker to the module amplifier. Run one exercise
at a time. Ctrl+C stops it and releases I2S.

The Code view sets MODE for each exercise: loudness, clap, recorder,
spectrum, game, or voice_fx.

Browser commands are newline-delimited: SENS 0..100 for clap detection;
REC, PLAY [volume], CLEAR for recorder; START rounds window sensitivity
and STOP for the game; REC, PLAY effect echo filter volume, CLEAR for
voice effects. Recordings remain in RAM and disappear when the script stops.
"""

import array
import math
import select
import sys
import time

import es8311

MODE = "loudness"
SDA_PIN = 1
SCL_PIN = 6
BCLK_PIN = 27
WS_PIN = 7
DOUT_PIN = 24
DIN_PIN = 26
MCLK_PIN = 10
RATE = 16000
FRAMES = 256
INPUT_GAIN = 0.6


def codec():
    return es8311.ES8311Audio(
        sda=SDA_PIN, scl=SCL_PIN, bclk=BCLK_PIN, ws=WS_PIN,
        mclk=MCLK_PIN, data_in=DOUT_PIN, data_out=DIN_PIN,
    )


def block_level(samples, count):
    """Return RMS and peak as fractions of full scale."""
    if count <= 0:
        return 0.0, 0.0
    total = 0
    peak = 0
    for i in range(count):
        value = abs(samples[i])
        total += value * value
        if value > peak:
            peak = value
    return math.sqrt(total / count) / 32768, peak / 32768


def dbfs(level):
    return 20 * math.log10(max(level, 1 / 32768))


def clap_threshold(floor, sensitivity=50):
    """Adaptive threshold; higher sensitivity accepts quieter claps."""
    sensitivity = max(0, min(100, sensitivity))
    return max(0.07 - sensitivity * 0.0006, floor * (4 - sensitivity * 0.028))


def clap_detected(peak, floor, now, last_clap, sensitivity=50):
    """A short peak above the learned floor, with a 300 ms guard."""
    return peak > clap_threshold(floor, sensitivity) and time.ticks_diff(now, last_clap) >= 300


class Commands:
    """Read newline-delimited browser commands without blocking I2S capture."""

    def __init__(self):
        self.poller = select.poll()
        self.poller.register(sys.stdin, select.POLLIN)
        self.line = ""

    def next(self):
        while self.poller.poll(0):
            char = sys.stdin.read(1)
            if char == "\r" or char == "\n":
                command = self.line.strip().split()
                self.line = ""
                if command:
                    return command
            elif char and len(self.line) < 64:
                self.line += char
        return None


def goertzel(samples, count, frequency):
    """Measure one frequency bin; used for the eight-band console spectrum."""
    coefficient = 2 * math.cos(2 * math.pi * frequency / RATE)
    previous = 0.0
    before = 0.0
    for i in range(count):
        current = samples[i] / 32768 + coefficient * previous - before
        before = previous
        previous = current
    return max(0.0, previous * previous + before * before - coefficient * previous * before)


def listen_level(audio):
    block = array.array("h", bytes(FRAMES * 2))
    last_print = time.ticks_ms()
    print("LEVEL,READY; speak or clap; Ctrl+C to stop")
    while True:
        count = audio.read_mono(block)
        if not count:
            continue
        rms, peak = block_level(block, count)
        now = time.ticks_ms()
        if time.ticks_diff(now, last_print) >= 250:
            print("LEVEL,%.1f,%.1f" % (dbfs(rms), dbfs(peak)))
            last_print = now


def clap_control(audio):
    block = array.array("h", bytes(FRAMES * 2))
    commands = Commands()
    floor = 0.005
    last_clap = time.ticks_add(time.ticks_ms(), -300)
    last_print = time.ticks_ms()
    led_on = False
    count_claps = 0
    sensitivity = 65
    print("CLAP,READY; adjust sensitivity and clap to toggle")
    print("CLAP,SENS,%d" % sensitivity)
    while True:
        command = commands.next()
        if command:
            if command[0] == "SENS" and len(command) == 2:
                try:
                    sensitivity = max(0, min(100, int(command[1])))
                    print("CLAP,SENS,%d" % sensitivity)
                except ValueError:
                    print("CLAP,ERROR,sensitivity")
            elif command[0] == "PING":
                print("CLAP,READY")
        count = audio.read_mono(block)
        if not count:
            continue
        rms, peak = block_level(block, count)
        now = time.ticks_ms()
        if clap_detected(peak, floor, now, last_clap, sensitivity):
            last_clap = now
            count_claps += 1
            led_on = not led_on
            print("CLAP,%d,%s" % (count_claps, "ON" if led_on else "OFF"))
        else:
            floor = 0.98 * floor + 0.02 * min(rms, 0.1)
        if time.ticks_diff(now, last_print) >= 250:
            print("CLAP,LEVEL,%.1f,%.1f" % (dbfs(peak), dbfs(clap_threshold(floor, sensitivity))))
            last_print = now


def record_clip(audio, seconds=2, report=None):
    """Record mono PCM in RAM. Playback starts only after RX is closed."""
    size = RATE * seconds
    clip = array.array("h", bytes(size * 2))
    block = array.array("h", bytes(FRAMES * 2))
    written = 0
    last_print = time.ticks_ms() if report else 0
    audio.begin_rx(rate=RATE, gain=INPUT_GAIN)
    try:
        while written < size:
            count = audio.read_mono(block, min(FRAMES, size - written))
            if count:
                clip[written:written + count] = block[:count]
                written += count
                if report:
                    now = time.ticks_ms()
                    if time.ticks_diff(now, last_print) >= 250:
                        rms, peak = block_level(block, count)
                        print("%s,LEVEL,%.1f,%.1f" % (report, dbfs(rms), dbfs(peak)))
                        last_print = now
    finally:
        audio.end()
    return clip


def effect_sample(clip, index, effect, echo_percent=0):
    value = clip[index]
    if effect == "robot":
        value = (value // 4096) * 4096
        if (index // 80) & 1:
            value = -value
    if echo_percent and index >= RATE // 5:
        value += clip[index - RATE // 5] * echo_percent // 100
    return max(-32768, min(32767, value))


def play_clip(audio, clip, effect="normal", echo_percent=0, tone_filter="none", volume=65):
    step = 1.5 if effect == "chipmunk" else 0.7 if effect == "giant" else 1.0
    stereo = array.array("h", bytes(FRAMES * 4))
    position = 0.0
    smooth = 0
    audio.begin_tx(rate=RATE, volume=max(0, min(100, volume)) / 100)
    try:
        while int(position) < len(clip):
            frames = 0
            while frames < FRAMES and int(position) < len(clip):
                index = int(position)
                value = effect_sample(clip, index, effect, echo_percent)
                smooth += (value - smooth) // 4
                if tone_filter == "low":
                    value = smooth
                elif tone_filter == "high":
                    value -= smooth
                stereo[2 * frames] = value
                stereo[2 * frames + 1] = value
                position += step
                frames += 1
            audio.write(memoryview(stereo)[:frames * 2])
        audio.write(bytes(2048))
        audio.write(bytes(2048))
    finally:
        audio.end()


def recorder(audio):
    commands = Commands()
    clip = None
    print("RECORDER,READY; send REC, PLAY or CLEAR")
    while True:
        command = commands.next()
        if not command:
            commands.poller.poll(100)
            continue
        if command == ["PING"]:
            print("RECORDER,READY")
        elif command == ["REC"]:
            clip = None
            print("RECORDER,START")
            clip = record_clip(audio, report="RECORDER")
            print("RECORDER,SAVED,%d" % len(clip))
        elif command[0] == "PLAY" and clip:
            try:
                volume = int(command[1]) if len(command) == 2 else 65
                if not 0 <= volume <= 100:
                    raise ValueError("volume")
                print("RECORDER,PLAY,%d" % len(clip))
                play_clip(audio, clip, volume=volume)
                print("RECORDER,DONE")
            except ValueError:
                print("RECORDER,ERROR,volume")
        elif command == ["CLEAR"]:
            clip = None
            print("RECORDER,CLEARED")
        else:
            print("RECORDER,ERROR,command")


FREQUENCIES = (125, 250, 500, 750, 1000, 1500, 2500, 4000)


def spectrum_bars(samples, count):
    """Show quiet microphone tones too; zero PCM still produces empty bands."""
    if count <= 0:
        return [""] * len(FREQUENCIES)
    bars = []
    for frequency in FREQUENCIES:
        magnitude = math.sqrt(goertzel(samples, count, frequency)) / count
        bars.append("#" * max(0, min(10, int((dbfs(magnitude) + 80) / 6))))
    return bars


def spectrum(audio):
    block = array.array("h", bytes(FRAMES * 2))
    last_print = time.ticks_ms()
    print("SPECTRUM,READY; bands in Hz:", FREQUENCIES)
    while True:
        count = audio.read_mono(block)
        if not count:
            continue
        now = time.ticks_ms()
        if time.ticks_diff(now, last_print) < 250:
            continue
        rms, peak = block_level(block, count)
        print("SPECTRUM,LEVEL,%.1f,%.1f" % (dbfs(rms), dbfs(peak)))
        print("SPECTRUM," + "|".join(spectrum_bars(block, count)))
        last_print = now


def sound_game(audio):
    """Wait for START, then run the selected number of timed clap rounds."""
    commands = Commands()
    print("GAME,READY; send START rounds window sensitivity")
    while True:
        command = commands.next()
        if not command:
            commands.poller.poll(100)
            continue
        if command == ["PING"]:
            print("GAME,READY")
        elif command[0] == "START" and len(command) == 4:
            try:
                rounds = int(command[1])
                window = int(command[2])
                sensitivity = int(command[3])
                if rounds not in (5, 10, 20) or window not in (600, 900, 1200) or not 0 <= sensitivity <= 100:
                    raise ValueError("range")
                print("GAME,START,%d,%d,%d" % (rounds, window, sensitivity))
                play_game(audio, commands, rounds, window, sensitivity)
                print("GAME,READY")
            except ValueError:
                print("GAME,ERROR,range")
        else:
            print("GAME,ERROR,command")


def play_game(audio, commands, rounds, window, sensitivity):
    block = array.array("h", bytes(FRAMES * 2))
    floor = 0.005
    started = time.ticks_ms()
    target = time.ticks_add(started, 1200)
    last_clap = time.ticks_add(started, -300)
    score = 0
    round_number = 1
    hit = False
    cue = False
    audio.begin_rx(rate=RATE, gain=INPUT_GAIN)
    try:
        while round_number <= rounds:
            if commands.next() == ["STOP"]:
                print("GAME,ABORT,%d/%d" % (score, rounds))
                return
            count = audio.read_mono(block)
            if not count:
                continue
            rms, peak = block_level(block, count)
            now = time.ticks_ms()
            if not cue and time.ticks_diff(now, target) >= 0:
                print("GAME,GO,%d" % round_number)
                cue = True
            if clap_detected(peak, floor, now, last_clap, sensitivity):
                last_clap = now
                if cue and not hit and 0 <= time.ticks_diff(now, target) <= window:
                    hit = True
                    score += 1
                    print("GAME,HIT,%d,%d" % (round_number, score))
            else:
                floor = 0.98 * floor + 0.02 * min(rms, 0.1)
            if time.ticks_diff(now, target) > window:
                if not hit:
                    print("GAME,MISS,%d,%d" % (round_number, score))
                round_number += 1
                target = time.ticks_add(target, window + 700)
                hit = False
                cue = False
        print("GAME,END,%d/%d" % (score, rounds))
    finally:
        audio.end()


def voice_fx(audio):
    commands = Commands()
    clip = None
    print("FX,READY; send REC, PLAY effect echo filter volume, or CLEAR")
    while True:
        command = commands.next()
        if not command:
            commands.poller.poll(100)
            continue
        if command == ["PING"]:
            print("FX,READY")
        elif command == ["REC"]:
            clip = None
            print("FX,RECORD")
            clip = record_clip(audio, report="FX")
            print("FX,SAVED,%d" % len(clip))
        elif command[0] == "PLAY" and len(command) == 5 and clip:
            try:
                effect = command[1]
                echo = int(command[2])
                tone_filter = command[3]
                volume = int(command[4])
                if effect not in ("normal", "robot", "echo", "chipmunk", "giant") or not 0 <= echo <= 80 or tone_filter not in ("none", "low", "high") or not 0 <= volume <= 100:
                    raise ValueError("range")
                print("FX,PLAY,%s" % effect)
                play_clip(audio, clip, effect, echo, tone_filter, volume)
                print("FX,DONE")
            except ValueError:
                print("FX,ERROR,range")
        elif command == ["CLEAR"]:
            clip = None
            print("FX,CLEARED")
        else:
            print("FX,ERROR,command")


def main():
    audio = codec()
    try:
        if MODE in ("loudness", "clap", "spectrum"):
            audio.begin_rx(rate=RATE, gain=INPUT_GAIN)
            {"loudness": listen_level, "clap": clap_control,
             "spectrum": spectrum}[MODE](audio)
        elif MODE == "game":
            sound_game(audio)
        elif MODE == "recorder":
            recorder(audio)
        elif MODE == "voice_fx":
            voice_fx(audio)
        else:
            raise ValueError("Unknown sound lab: " + MODE)
    finally:
        audio.end()


if __name__ == "__main__":
    main()
