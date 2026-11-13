"""Generate the three original, bundled ES8311 player demos.

Run from the repository root with Python 3 and ffmpeg installed. No external
samples or recordings are used; every note is synthesized here.
"""

from array import array
from math import exp, pi, sin
from pathlib import Path
from subprocess import run
from tempfile import TemporaryDirectory
import wave


RATE = 22050
OUT = Path("src/features/flasher/audio-player/tracks")


def hz(name):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
             "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    if name == "-":
        return 0
    pitch = name[:-1]
    octave = int(name[-1])
    midi = 12 * (octave + 1) + names[pitch]
    return 440 * 2 ** ((midi - 69) / 12)


def add_note(samples, start, length, name, strength, instrument):
    frequency = hz(name)
    if not frequency:
        return
    first = int(start * RATE)
    count = min(len(samples) - first, int(length * RATE))
    if count <= 0:
        return
    for i in range(count):
        t = i / RATE
        x = i / count
        attack = min(1, t / (0.008 if instrument == "lead" else 0.035))
        release = min(1, (1 - x) / 0.13)
        if instrument == "bell":
            tone = (sin(2 * pi * frequency * t) + 0.32 * sin(2 * pi * frequency * 2.01 * t)) * exp(-4.2 * x)
        elif instrument == "bass":
            tone = sin(2 * pi * frequency * t) + 0.22 * sin(4 * pi * frequency * t)
        elif instrument == "pad":
            tone = sin(2 * pi * frequency * t) + 0.13 * sin(4 * pi * frequency * t)
        else:
            tone = (sin(2 * pi * frequency * t) + 0.29 * sin(4 * pi * frequency * t)
                    + 0.09 * sin(6 * pi * frequency * t))
        samples[first + i] += strength * attack * release * tone


def song(name, bpm, chords, melody, lead="lead"):
    beat = 60 / bpm
    bars = len(chords)
    duration = bars * 4 * beat + 0.25
    samples = array("f", [0]) * int(duration * RATE)
    for bar, chord in enumerate(chords):
        start = bar * 4 * beat
        for note in chord[1:]:
            add_note(samples, start, 4 * beat, note, 0.10, "pad")
        for offset in range(4):
            add_note(samples, start + offset * beat, 0.82 * beat, chord[0], 0.20, "bass")
        for offset, note in enumerate((chord[1], chord[2], chord[3], chord[2], chord[1], chord[2], chord[3], chord[2])):
            add_note(samples, start + offset * beat / 2, 0.43 * beat, note, 0.095, "bell")
    for index, note in enumerate(melody):
        add_note(samples, index * beat / 2, 0.86 * beat / 2, note, 0.21, lead)
    peak = max(abs(value) for value in samples) or 1
    pcm = array("h", (round(max(-1, min(1, value / peak * 0.82)) * 32767) for value in samples))
    with TemporaryDirectory() as temp:
        wav = Path(temp) / "track.wav"
        with wave.open(str(wav), "wb") as file:
            file.setnchannels(1)
            file.setsampwidth(2)
            file.setframerate(RATE)
            file.writeframes(pcm.tobytes())
        OUT.mkdir(parents=True, exist_ok=True)
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
             "-codec:a", "libmp3lame", "-qscale:a", "5", str(OUT / f"{name}.mp3")], check=True)


song("pulso-solar", 120,
     [("C3", "C4", "E4", "G4"), ("A2", "A3", "C4", "E4"),
      ("F2", "F3", "A3", "C4"), ("G2", "G3", "B3", "D4")] * 2,
     ["E5", "G5", "A5", "G5", "E5", "D5", "C5", "-",
      "C5", "E5", "G5", "E5", "D5", "C5", "A4", "-",
      "A4", "C5", "F5", "E5", "C5", "A4", "G4", "-",
      "B4", "D5", "G5", "F5", "D5", "B4", "G4", "-",
      "E5", "G5", "C6", "G5", "E5", "D5", "C5", "-",
      "C5", "E5", "A5", "G5", "E5", "C5", "A4", "-",
      "A4", "C5", "F5", "C5", "A4", "G4", "F4", "-",
      "B4", "D5", "G5", "D5", "B4", "A4", "G4", "-"])

song("circuito-azul", 100,
     [("E2", "E3", "G3", "B3"), ("C3", "C4", "E4", "G4"),
      ("G2", "G3", "B3", "D4"), ("D3", "D4", "F#4", "A4")] * 2,
     ["B4", "E5", "G5", "E5", "D5", "B4", "G4", "-",
      "G4", "C5", "E5", "G5", "E5", "C5", "G4", "-",
      "B4", "D5", "G5", "D5", "B4", "A4", "G4", "-",
      "A4", "D5", "F#5", "A5", "F#5", "D5", "A4", "-",
      "B4", "E5", "G5", "B5", "G5", "E5", "B4", "-",
      "G4", "C5", "E5", "C5", "G4", "E4", "G4", "-",
      "B4", "D5", "G5", "B5", "G5", "D5", "B4", "-",
      "A4", "D5", "F#5", "D5", "A4", "F#4", "D4", "-"])

song("aurora", 90,
     [("D3", "D4", "F4", "A4"), ("A#2", "A#3", "D4", "F4"),
      ("F2", "F3", "A3", "C4"), ("C3", "C4", "E4", "G4")] * 2,
     ["A4", "D5", "F5", "D5", "A4", "F4", "D4", "-",
      "F4", "A#4", "D5", "F5", "D5", "A#4", "F4", "-",
      "A4", "C5", "F5", "C5", "A4", "G4", "F4", "-",
      "G4", "C5", "E5", "G5", "E5", "C5", "G4", "-",
      "A4", "D5", "F5", "A5", "F5", "D5", "A4", "-",
      "F4", "A#4", "D5", "A#4", "F4", "D4", "F4", "-",
      "A4", "C5", "F5", "A5", "F5", "C5", "A4", "-",
      "G4", "C5", "E5", "C5", "G4", "E4", "C4", "-"], "bell")
