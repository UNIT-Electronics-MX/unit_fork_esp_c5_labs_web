"""Play a song sent from the browser through the ES8311 speaker.

Install es8311.py first, run this script from the Code view, then open the
audio player and choose a WAV or MP3 file. The browser converts the file to
16-bit mono PCM and streams it over USB.

Wire the codec for PLAYBACK with USB unplugged (same wiring as the melody):
  BCLK -> J20 GPIO27, WS -> J20 GPIO7, DIN -> J20 GPIO26,
  MCLK -> J20 GPIO10, SDA -> QWIIC GPIO1, SCL -> QWIIC GPIO6,
  3V3 -> 3V3, GND -> GND; connect a speaker to the codec output.

Protocol (browser -> board). The browser sends only printable ASCII, because the
MicroPython console treats a 0x03 byte as Ctrl+C even inside binary data and a
song would interrupt the script almost at once:
  P<5 digits rate>          open the codec at that rate; answers ACCEPT, or REJECT
  F<4 digits n><n base64>   one block of mono PCM16 little-endian; answers CHUNK
  V<3 digits percent>       codec volume 000..100
  E                         end of song: drain the audio, close the codec, answer DONE
The answers are control bytes (0x06 ACCEPT, 0x15 REJECT, 0x01 CHUNK, 0x04 DONE) that
never appear in the text lines, so they cannot be confused with "PLAYER,READY",
which the board prints every 1.5 s while idle. Ctrl+C closes I2S.
"""

import binascii
import select
import sys

import es8311

SDA_PIN = 1         # QWIIC SDA
SCL_PIN = 6         # QWIIC SCL
BCLK_PIN = 27       # J20: ES8311 SCLK/BCLK
WS_PIN = 7          # J20: ES8311 LRCK/WS
DIN_PIN = 26        # J20: Pulsar C5 output -> ES8311 SDIN (speaker)
MCLK_PIN = 10       # J20: ES8311 MCLK (256 x fs)

RATES = (8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000)
VOLUME = 0.7
MAX_BYTES = 1536      # PCM bytes per block (2048 base64 characters)
MAX_TEXT = 2048
ACCEPT, REJECT, CHUNK, DONE = b"\x06", b"\x15", b"\x01", b"\x04"

_DUP_SRC = """
@micropython.viper
def dup(src: ptr16, dst: ptr16, frames: int):
    for i in range(frames):
        v = src[i]
        dst[2 * i] = v
        dst[2 * i + 1] = v
"""


def _dup_py(src, dst, frames):
    # src and dst are bytearrays: copy each 16-bit sample into both stereo slots.
    for i in range(frames):
        lo = src[2 * i]
        hi = src[2 * i + 1]
        dst[4 * i] = lo
        dst[4 * i + 1] = hi
        dst[4 * i + 2] = lo
        dst[4 * i + 3] = hi


try:
    _ns = {}
    exec(_DUP_SRC, _ns)
    dup = _ns["dup"]
except Exception:  # firmware without the native emitter
    dup = _dup_py

source = sys.stdin.buffer
out = sys.stdout.buffer
poller = select.poll()
poller.register(sys.stdin, select.POLLIN)


def read_exact(view):
    got = 0
    while got < len(view):
        count = source.readinto(view[got:])
        if count:
            got += count


def number(view):
    return int(bytes(view))


def main():
    audio = es8311.ES8311Audio(sda=SDA_PIN, scl=SCL_PIN, mclk=MCLK_PIN,
                               bclk=BCLK_PIN, ws=WS_PIN, data_out=DIN_PIN)
    # bytearrays, so slicing counts bytes (a memoryview of an array('h') counts samples).
    text = bytearray(MAX_TEXT)
    mono = bytearray(MAX_BYTES)
    stereo = bytearray(MAX_BYTES * 2)
    text_view = memoryview(text)
    mono_view = memoryview(mono)
    stereo_view = memoryview(stereo)
    head = bytearray(5)
    head_view = memoryview(head)
    volume = int(VOLUME * 100)
    print("PLAYER,READY")
    try:
        while True:
            if not audio.is_active() and not poller.poll(1500):
                print("PLAYER,READY")  # idle: let the browser see the player is alive
                continue
            tag = source.read(1)
            if not tag:
                continue
            if tag == b"P":
                read_exact(head_view)
                rate = number(head_view)
                if rate in RATES and not audio.is_active():
                    audio.begin_tx(rate=rate, volume=volume / 100, ibuf=16384)
                    out.write(ACCEPT)
                else:
                    out.write(REJECT)
            elif tag == b"F" and audio.is_active():
                read_exact(head_view[:4])
                length = min(number(head_view[:4]), MAX_TEXT)
                read_exact(text_view[:length])
                data = binascii.a2b_base64(text_view[:length])
                size = min(len(data), MAX_BYTES) & ~1
                mono_view[:size] = data[:size]
                dup(mono, stereo, size // 2)
                audio.write(stereo_view[:size * 2])
                out.write(CHUNK)
            elif tag == b"V":
                read_exact(head_view[:3])
                volume = min(number(head_view[:3]), 100)
                if audio.is_active():
                    audio.set_volume(volume / 100)
            elif tag == b"E":
                if audio.is_active():
                    silence = bytes(2048)
                    for _ in range(4):  # push the tail of the song out of the DMA buffer
                        audio.write(silence)
                    audio.end()
                out.write(DONE)
    finally:
        audio.end()


main()
