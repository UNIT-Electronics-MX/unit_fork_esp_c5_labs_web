"""Development checks for the ES8311 sound exercises (no board required)."""

import array
import importlib.util
import math
import sys
import types
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch


sys.modules["es8311"] = types.ModuleType("es8311")
script = Path(__file__).with_name("es8311_sound_labs.py")
spec = importlib.util.spec_from_file_location("sound_labs", script)
sound = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sound)
sound.time = types.SimpleNamespace(ticks_diff=lambda now, before: now - before)


class FakeAudio:
    def __init__(self):
        self.started = []
        self.writes = []
        self.ends = 0

    def begin_tx(self, **kwargs):
        self.started.append(kwargs)

    def write(self, data):
        self.writes.append(bytes(data))

    def end(self):
        self.ends += 1


class FakeCaptureAudio(FakeAudio):
    def begin_rx(self, **kwargs):
        self.started.append(kwargs)

    def read_mono(self, out, max_frames=None):
        frames = min(len(out), max_frames or len(out))
        for i in range(frames):
            out[i] = 1000
        return frames


class ScriptedCommands:
    def __init__(self, commands):
        self.commands = iter(commands)

    def next(self):
        return next(self.commands)


class SoundLabTests(unittest.TestCase):
    def test_rms_peak_and_dbfs(self):
        rms, peak = sound.block_level(array.array("h", [0, 16384, -16384, 0]), 4)
        self.assertAlmostEqual(rms, math.sqrt(0.125), places=5)
        self.assertAlmostEqual(peak, 0.5)
        self.assertAlmostEqual(sound.dbfs(1), 0)
        self.assertLess(sound.dbfs(0), -80)

    def test_clap_threshold_and_refractory_time(self):
        self.assertGreater(sound.clap_threshold(0.01, 0), sound.clap_threshold(0.01, 100))
        self.assertFalse(sound.clap_detected(0.02, 0.01, 500, 0, 0))
        self.assertTrue(sound.clap_detected(0.02, 0.01, 500, 0, 100))
        self.assertFalse(sound.clap_detected(0.2, 0.01, 200, 0))
        self.assertTrue(sound.clap_detected(0.2, 0.01, 350, 0))
        self.assertFalse(sound.clap_detected(0.2, 0.08, 350, 0, 0))

    def test_frequency_bin_prefers_matching_tone(self):
        samples = array.array("h", [int(12000 * math.sin(2 * math.pi * 1000 * i / sound.RATE))
                                    for i in range(sound.FRAMES)])
        target = sound.goertzel(samples, len(samples), 1000)
        distant = sound.goertzel(samples, len(samples), 4000)
        self.assertGreater(target, distant * 100)

    def test_spectrum_shows_quiet_tone_but_keeps_zero_pcm_empty(self):
        quiet = array.array("h", [int(80 * math.sin(2 * math.pi * 1000 * i / sound.RATE))
                                  for i in range(sound.FRAMES)])
        bars = sound.spectrum_bars(quiet, len(quiet))
        self.assertGreater(len(bars[4]), 0)
        self.assertGreater(len(bars[4]), len(bars[7]))
        self.assertEqual(sound.spectrum_bars(array.array("h", [0] * sound.FRAMES), sound.FRAMES), [""] * 8)

    def voice(self, seconds=0.5):
        """A spoken-like test signal: 220 Hz with 700 Hz and 2 kHz overtones."""
        count = int(sound.RATE * seconds)
        return array.array("h", [int(7000 * math.sin(2 * math.pi * 220 * i / sound.RATE)
                                     + 5000 * math.sin(2 * math.pi * 700 * i / sound.RATE)
                                     + 3000 * math.sin(2 * math.pi * 2000 * i / sound.RATE))
                                 for i in range(count)])

    def test_every_effect_renders_full_scale_without_touching_the_take(self):
        clip = self.voice()
        original = array.array("h", clip)
        for effect in sound.EFFECTS:
            for amount in (0, 50, 100):
                out = sound.render_fx(clip, effect, amount)
                self.assertGreater(len(out), 0, effect)
                peak = max(abs(v) for v in out)
                self.assertLessEqual(peak, 32767, effect)
                self.assertGreater(peak, 16384, (effect, amount))  # louder than -6 dBFS
        self.assertEqual(clip, original)

    def test_pitch_effects_change_duration_and_others_keep_or_extend_it(self):
        clip = self.voice()
        n = len(clip)
        self.assertLess(len(sound.render_fx(clip, "chipmunk", 0)), n)
        self.assertLess(len(sound.render_fx(clip, "chipmunk", 100)), len(sound.render_fx(clip, "chipmunk", 0)))
        self.assertGreater(len(sound.render_fx(clip, "giant", 100)), len(sound.render_fx(clip, "giant", 0)))
        self.assertGreater(len(sound.render_fx(clip, "echo", 50)), n)
        self.assertGreater(len(sound.render_fx(clip, "cave", 50)), n)
        for effect in ("normal", "robot", "tremolo", "retro", "reverse", "telephone"):
            self.assertEqual(len(sound.render_fx(clip, effect, 50)), n, effect)

    def test_reverse_plays_the_take_backwards(self):
        clip = array.array("h", [100, 200, 300, -400])
        out = sound.render_fx(clip, "reverse", 0)
        self.assertEqual([v // abs(v) for v in out], [-1, 1, 1, 1])
        self.assertGreater(abs(out[0]), abs(out[3]))

    def band_energy(self, samples, frequency):
        return sound.goertzel(samples, len(samples), frequency)

    def test_filters_keep_their_band(self):
        clip = self.voice()
        for kind, keep, cut in (("low", 220, 2000), ("high", 2000, 220)):
            out = sound.filtered(clip, kind, 700)
            before = self.band_energy(clip, keep) / self.band_energy(clip, cut)
            after = self.band_energy(out, keep) / self.band_energy(out, cut)
            self.assertGreater(after, before * 4, kind)
        band = sound.filtered(clip, "band", 2000)
        self.assertGreater(self.band_energy(band, 2000) / self.band_energy(band, 220),
                           self.band_energy(clip, 2000) / self.band_energy(clip, 220) * 4)
        self.assertIs(sound.filtered(clip, "none", 700), clip)

    def test_effect_amount_changes_the_result(self):
        clip = self.voice()
        for effect in ("robot", "alien", "vibrato", "tremolo", "echo", "cave", "radio", "retro", "overdrive"):
            self.assertNotEqual(sound.render_fx(clip, effect, 0), sound.render_fx(clip, effect, 100), effect)

    def test_playback_writes_every_sample_twice_and_releases_i2s(self):
        audio = FakeAudio()
        clip = array.array("h", range(300))
        sound.play_clip(audio, clip, volume=40)
        stereo = array.array("h", b"".join(audio.writes[:-2]))
        self.assertEqual(list(stereo[0:6]), [0, 0, 1, 1, 2, 2])
        self.assertEqual(len(stereo), 600)
        self.assertEqual(audio.started[0], {"rate": sound.RATE, "volume": 0.4})
        self.assertEqual(audio.ends, 1)

    def test_recorder_waits_for_web_commands(self):
        output = StringIO()
        commands = ScriptedCommands([["REC"], ["PLAY", "70"], ["CLEAR"]])
        with patch.object(sound, "Commands", return_value=commands), \
                patch.object(sound, "record_clip", return_value=array.array("h", [1000] * 8)), \
                patch.object(sound, "play_clip") as play, redirect_stdout(output):
            with self.assertRaises(StopIteration):
                sound.recorder(FakeAudio())
        self.assertIn("RECORDER,START", output.getvalue())
        self.assertIn("RECORDER,SAVED,8", output.getvalue())
        self.assertIn("RECORDER,PLAY,8", output.getvalue())
        self.assertIn("RECORDER,CLEARED", output.getvalue())
        self.assertEqual(play.call_args.kwargs["volume"], 70)

    def test_game_and_fx_accept_web_options(self):
        output = StringIO()
        game_commands = ScriptedCommands([["START", "5", "1200", "65"]])
        with patch.object(sound, "Commands", return_value=game_commands), \
                patch.object(sound, "play_game") as game, redirect_stdout(output):
            with self.assertRaises(StopIteration):
                sound.sound_game(FakeAudio())
        game.assert_called_once_with(game.call_args.args[0], game_commands, 5, 1200, 65)
        self.assertIn("GAME,START,5,1200,65", output.getvalue())

        output = StringIO()
        fx_commands = ScriptedCommands([["PLAY", "cave", "50", "none", "1200", "70"], ["REC"],
                                        ["PLAY", "cave", "55", "band", "900", "70"],
                                        ["PLAY", "cave", "55", "band", "9000", "70"],
                                        ["PLAY", "flanger", "55", "none", "900", "70"]])
        with patch.object(sound, "Commands", return_value=fx_commands), \
                patch.object(sound, "record_clip", return_value=array.array("h", [1000] * 8)), \
                patch.object(sound, "render_fx", return_value=array.array("h", [1000] * 12)) as render, \
                patch.object(sound, "play_clip") as play, redirect_stdout(output):
            with self.assertRaises(StopIteration):
                sound.voice_fx(FakeAudio())
        text = output.getvalue()
        self.assertIn("FX,ERROR,noclip", text)
        self.assertIn("FX,SAVED,8", text)
        self.assertIn("FX,RENDER,cave", text)
        self.assertIn("FX,PLAY,cave,12", text)
        self.assertEqual(text.count("FX,ERROR,range"), 2)
        render.assert_called_once_with(render.call_args.args[0], "cave", 55, "band", 900)
        self.assertEqual(play.call_args.kwargs["volume"], 70)

    def test_recorder_closes_receive_before_playback(self):
        audio = FakeCaptureAudio()
        clip = sound.record_clip(audio, seconds=1)
        self.assertEqual(len(clip), sound.RATE)
        self.assertEqual(clip[0], 1000)
        self.assertEqual(clip[-1], 1000)
        self.assertEqual(audio.ends, 1)
        sound.play_clip(audio, clip)
        self.assertEqual(audio.ends, 2)
        self.assertEqual(audio.started[0]["rate"], sound.RATE)
        self.assertEqual(audio.started[1]["rate"], sound.RATE)


if __name__ == "__main__":
    unittest.main()
