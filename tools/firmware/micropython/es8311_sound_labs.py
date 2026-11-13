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
and STOP for the game; REC, PLAY effect amount filter cutoff volume,
CLEAR for voice effects. Recordings remain in RAM and disappear when the script stops.
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


def play_clip(audio, clip, volume=65):
    """Play mono PCM through the codec speaker, then a short silence."""
    stereo = array.array("h", bytes(FRAMES * 4))
    audio.begin_tx(rate=RATE, volume=max(0, min(100, volume)) / 100)
    try:
        position = 0
        while position < len(clip):
            frames = min(FRAMES, len(clip) - position)
            for i in range(frames):
                value = clip[position + i]
                stereo[2 * i] = value
                stereo[2 * i + 1] = value
            audio.write(memoryview(stereo)[:frames * 2])
            position += frames
        audio.write(bytes(2048))
        audio.write(bytes(2048))
    finally:
        audio.end()


# ---- Voice effects -------------------------------------------------------
# Each effect is rendered into a new buffer before playback, so heavy effects
# never make the speaker stutter. Only integer maths runs per sample: small
# MicroPython integers do not allocate, floats would.

EFFECTS = ("normal", "robot", "alien", "chipmunk", "giant", "vibrato",
           "tremolo", "echo", "cave", "telephone", "radio", "retro",
           "overdrive", "reverse")
FILTERS = ("none", "low", "high", "band")
MIN_CUTOFF = 150
MAX_CUTOFF = 6000
# One sine period in 256 steps, Q14 (16384 = 1.0).
SINE = array.array("h", [int(16384 * math.sin(2 * math.pi * i / 256)) for i in range(256)])


def clamp16(value):
    return -32768 if value < -32768 else 32767 if value > 32767 else value


def phase_step(frequency):
    """Phase increment per sample for SINE, in 1/65536 of a table step."""
    return int(frequency * 256 * 65536 / RATE)


def one_pole(cutoff):
    """Q12 smoothing factor of a one-pole low pass at this cutoff."""
    return max(1, min(4096, int(4096 * (1 - math.exp(-2 * math.pi * cutoff / RATE)))))


def resample(clip, step):
    """Change speed and pitch together; step is Q8 (256 = original speed)."""
    count = (len(clip) - 1) * 256 // step + 1
    out = array.array("h", bytes(count * 2))
    position = 0
    last = len(clip) - 1
    for i in range(count):
        index = position >> 8
        value = clip[index]
        if index < last:
            value += (clip[index + 1] - value) * (position & 255) >> 8
        out[i] = value
        position += step
    return out


def ring(clip, frequency, dry):
    """Multiply by a sine carrier: metallic robot and alien voices."""
    out = array.array("h", bytes(len(clip) * 2))
    phase = 0
    step = phase_step(frequency)
    wet = 100 - dry
    for i in range(len(clip)):
        value = clip[i]
        modulated = value * SINE[(phase >> 16) & 255] >> 14
        out[i] = (modulated * wet + value * dry) // 100
        phase += step
    return out


def vibrato(clip, depth, frequency):
    """Read through a delay that swings back and forth: the pitch wobbles."""
    out = array.array("h", bytes(len(clip) * 2))
    phase = 0
    step = phase_step(frequency)
    for i in range(len(clip)):
        index = i - depth - (depth * SINE[(phase >> 16) & 255] >> 14)
        out[i] = clip[index] if index >= 0 else 0
        phase += step
    return out


def tremolo(clip, frequency):
    """Fade the level up and down several times a second."""
    out = array.array("h", bytes(len(clip) * 2))
    phase = 0
    step = phase_step(frequency)
    for i in range(len(clip)):
        gain = (16384 + SINE[(phase >> 16) & 255]) >> 1
        out[i] = clip[i] * gain >> 14
        phase += step
    return out


def with_tail(clip, extra):
    out = array.array("h", bytes((len(clip) + extra) * 2))
    out[:len(clip)] = clip
    return out


def echo(clip, delay, feedback):
    """Repeats that fade by feedback percent each time."""
    out = with_tail(clip, delay * 4)
    for i in range(delay, len(out)):
        out[i] = clamp16(out[i] + out[i - delay] * feedback // 100)
    return out


def cave(clip, size):
    """Four feedback comb filters in parallel: a small room up to a cave."""
    d1, d2, d3, d4 = 557, 593, 641, 677
    feedback = 62 + size * 28 // 100
    c1 = array.array("h", bytes(d1 * 2))
    c2 = array.array("h", bytes(d2 * 2))
    c3 = array.array("h", bytes(d3 * 2))
    c4 = array.array("h", bytes(d4 * 2))
    out = with_tail(clip, RATE * (3 + size // 25) // 10)
    for i in range(len(out)):
        dry = out[i]
        t1 = i % d1
        t2 = i % d2
        t3 = i % d3
        t4 = i % d4
        y1 = c1[t1]
        y2 = c2[t2]
        y3 = c3[t3]
        y4 = c4[t4]
        c1[t1] = clamp16(dry + y1 * feedback // 100)
        c2[t2] = clamp16(dry + y2 * feedback // 100)
        c3[t3] = clamp16(dry + y3 * feedback // 100)
        c4[t4] = clamp16(dry + y4 * feedback // 100)
        out[i] = clamp16(dry * 2 // 3 + (y1 + y2 + y3 + y4) // 6)
    return out


def soft_clip(value, knee):
    """Above the knee the level grows four times slower: a warm distortion."""
    if value > knee:
        return knee + (value - knee) // 4
    if value < -knee:
        return -knee + (value + knee) // 4
    return value


def drive(clip, gain, knee):
    out = array.array("h", bytes(len(clip) * 2))
    for i in range(len(clip)):
        out[i] = clamp16(soft_clip(clip[i] * gain, knee))
    return out


def filtered(clip, kind, cutoff):
    """Two cascaded one-pole stages (12 dB per octave) at the cutoff."""
    if kind == "none":
        return clip
    if kind == "band":
        return band(clip, cutoff * 2 // 3, cutoff * 3 // 2)
    a = one_pole(cutoff)
    out = array.array("h", bytes(len(clip) * 2))
    first = 0
    second = 0
    for i in range(len(clip)):
        value = clip[i]
        first += (value - first) * a >> 12
        if kind == "low":
            second += (first - second) * a >> 12
            out[i] = second
        else:
            high = value - first
            second += (high - second) * a >> 12
            out[i] = clamp16(high - second)
    return out


def band(clip, low, high):
    """Keep only what lies between two cutoffs."""
    return filtered(filtered(clip, "high", low), "low", high)


def crush(clip, hold, bits):
    """Keep each sample for several steps and drop its low bits: 8-bit sound."""
    out = array.array("h", bytes(len(clip) * 2))
    shift = 16 - bits
    value = 0
    for i in range(len(clip)):
        if i % hold == 0:
            value = (clip[i] >> shift) << shift
        out[i] = value
    return out


def crackle(clip, amount):
    """Sparse clicks from a 16-bit xorshift generator, like a weak station."""
    out = array.array("h", bytes(len(clip) * 2))
    seed = 0xACE1
    level = 400 + amount * 30
    for i in range(len(clip)):
        seed ^= (seed << 7) & 0xFFFF
        seed ^= seed >> 9
        seed ^= (seed << 8) & 0xFFFF
        noise = ((seed & 0xFF) - 128) * level >> 7 if (seed & 0x1F00) == 0 else 0
        out[i] = clamp16(clip[i] + noise)
    return out


def normalized(clip, target=29000):
    """Scale the loudest sample to target, boosting quiet takes at most 4x."""
    peak = 1
    for value in clip:
        if value > peak:
            peak = value
        elif -value > peak:
            peak = -value
    scale = min(16384, target * 4096 // peak)
    if scale == 4096:
        return clip
    for i in range(len(clip)):
        clip[i] = clamp16(clip[i] * scale >> 12)
    return clip


def render_fx(clip, effect, amount=50, tone_filter="none", cutoff=1200):
    """Return a new buffer with the effect, then the filter, then normalized."""
    amount = max(0, min(100, amount))
    if effect == "robot":
        out = crush(ring(clip, 40 + amount * 120 // 100, 15), 1, 12)
    elif effect == "alien":
        out = vibrato(ring(clip, 300 + amount * 9, 25), 6, 7)
    elif effect == "chipmunk":
        out = resample(clip, 333 + amount * 179 // 100)
    elif effect == "giant":
        out = resample(clip, 205 - amount * 77 // 100)
    elif effect == "vibrato":
        out = vibrato(clip, 4 + amount * 40 // 100, 5 + amount // 25)
    elif effect == "tremolo":
        out = tremolo(clip, 2 + amount // 10)
    elif effect == "echo":
        out = echo(clip, RATE * (120 + amount * 3) // 1000, 55)
    elif effect == "cave":
        out = cave(clip, amount)
    elif effect == "telephone":
        # The classic telephone band, 300 to 3400 Hz, slightly overdriven.
        out = band(drive(band(clip, 300, 3400), 1 + amount * 3 // 100, 14000), 300, 3400)
    elif effect == "radio":
        # A narrower band, harder clipping and crackle: a distant AM station.
        out = band(crackle(drive(band(clip, 500, 2500), 2 + amount * 4 // 100, 9000), amount), 500, 2500)
    elif effect == "retro":
        out = crush(clip, 1 + amount * 7 // 100, 8 - amount * 4 // 100)
    elif effect == "overdrive":
        out = drive(clip, 1 + amount * 9 // 100, 12000)
    elif effect == "reverse":
        out = array.array("h", bytes(len(clip) * 2))
        last = len(clip) - 1
        for i in range(len(clip)):
            out[i] = clip[last - i]
    else:
        out = array.array("h", clip)
    return normalized(filtered(out, tone_filter, cutoff))


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
    print("FX,READY; send REC, PLAY effect amount filter cutoff volume, or CLEAR")
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
        elif command[0] == "PLAY" and len(command) == 6:
            if not clip:
                print("FX,ERROR,noclip")
                continue
            try:
                effect = command[1]
                amount = int(command[2])
                tone_filter = command[3]
                cutoff = int(command[4])
                volume = int(command[5])
                if (effect not in EFFECTS or tone_filter not in FILTERS or not 0 <= amount <= 100
                        or not MIN_CUTOFF <= cutoff <= MAX_CUTOFF or not 0 <= volume <= 100):
                    raise ValueError("range")
            except ValueError:
                print("FX,ERROR,range")
                continue
            print("FX,RENDER,%s" % effect)
            rendered = render_fx(clip, effect, amount, tone_filter, cutoff)
            print("FX,PLAY,%s,%d" % (effect, len(rendered)))
            play_clip(audio, rendered, volume=volume)
            rendered = None
            print("FX,DONE")
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
