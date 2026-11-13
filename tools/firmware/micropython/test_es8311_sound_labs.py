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

    def test_effects_and_playback_length(self):
        clip = array.array("h", [12000] * 128)
        self.assertEqual(sound.effect_sample(clip, 0, "robot"), 8192)
        self.assertEqual(sound.effect_sample(clip, 0, "normal"), 12000)
        normal = FakeAudio()
        fast = FakeAudio()
        slow = FakeAudio()
        sound.play_clip(normal, clip, "normal")
        sound.play_clip(fast, clip, "chipmunk")
        sound.play_clip(slow, clip, "giant")
        # Ignore the two tail-silence writes when comparing recorded frames.
        self.assertLess(len(fast.writes[0]), len(normal.writes[0]))
        self.assertGreater(len(slow.writes[0]), len(normal.writes[0]))
        for audio in (normal, fast, slow):
            self.assertEqual(audio.ends, 1)
            self.assertEqual(audio.started[0]["rate"], sound.RATE)

    def test_echo_and_filters_change_the_samples(self):
        clip = array.array("h", [12000] * (sound.RATE // 5 + 2))
        self.assertEqual(sound.effect_sample(clip, sound.RATE // 5, "echo", 50), 18000)
        self.assertEqual(sound.effect_sample(clip, sound.RATE // 5, "robot", 50), 14192)
        dry = FakeAudio()
        soft = FakeAudio()
        bright = FakeAudio()
        sound.play_clip(dry, clip)
        sound.play_clip(soft, clip, tone_filter="low")
        sound.play_clip(bright, clip, tone_filter="high")
        self.assertEqual(array.array("h", dry.writes[0])[0], 12000)
        self.assertEqual(array.array("h", dry.writes[12])[256], 12000)
        self.assertLess(array.array("h", soft.writes[0])[0], 12000)
        self.assertGreater(array.array("h", bright.writes[0])[0], 0)

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
        fx_commands = ScriptedCommands([["REC"], ["PLAY", "echo", "55", "low", "70"]])
        with patch.object(sound, "Commands", return_value=fx_commands), \
                patch.object(sound, "record_clip", return_value=array.array("h", [1000] * 8)), \
                patch.object(sound, "play_clip") as play, redirect_stdout(output):
            with self.assertRaises(StopIteration):
                sound.voice_fx(FakeAudio())
        self.assertIn("FX,SAVED,8", output.getvalue())
        self.assertIn("FX,PLAY,echo", output.getvalue())
        play.assert_called_once_with(play.call_args.args[0], play.call_args.args[1], "echo", 55, "low", 70)

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
