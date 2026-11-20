import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from media import AsrWord, Segment, asr_words, build_filter, enhance_chain, padded  # noqa: E402


class EnhanceChainTest(unittest.TestCase):
    def test_full_strength_denoises_gates_and_normalises_to_podcast_loudness(self):
        chain = enhance_chain(100)
        self.assertTrue(chain.startswith("highpass=f=80"))
        self.assertIn("afftdn=nr=40", chain)
        self.assertIn("agate=", chain)
        self.assertIn("range=0.100", chain)
        self.assertTrue(chain.endswith("loudnorm=I=-16:TP=-1.5:LRA=11"))

    def test_zero_strength_only_levels_the_voice(self):
        chain = enhance_chain(0)
        self.assertNotIn("afftdn", chain)
        self.assertNotIn("agate", chain)
        self.assertNotIn("deesser", chain)
        self.assertIn("acompressor", chain)
        self.assertIn("loudnorm", chain)

    def test_strength_is_clamped(self):
        self.assertEqual(enhance_chain(250), enhance_chain(100))
        self.assertEqual(enhance_chain(-5), enhance_chain(0))

    def test_more_strength_means_more_noise_reduction(self):
        self.assertIn("afftdn=nr=25", enhance_chain(50))


class PaddedTest(unittest.TestCase):
    def test_adds_margin_on_both_sides(self):
        self.assertEqual(padded(Segment("a", 1000, 2000), 10_000), (970, 2030))

    def test_clamps_to_the_asset(self):
        self.assertEqual(padded(Segment("a", 10, 9_990), 10_000), (0, 10_000))


class BuildFilterTest(unittest.TestCase):
    def test_two_segments_from_one_asset_are_trimmed_and_concatenated_in_order(self):
        graph = build_filter(
            [Segment("a", 1000, 2000), Segment("a", 5000, 6000)],
            {"a": 0},
            {"a": 10_000},
        )
        self.assertIn("[0:a]atrim=start=0.970:end=2.030", graph)
        self.assertIn("[0:a]atrim=start=4.970:end=6.030", graph)
        self.assertTrue(graph.endswith("[s0][s1]concat=n=2:v=0:a=1[out]"))

    def test_each_segment_reads_from_its_own_input(self):
        graph = build_filter([Segment("a", 0, 500), Segment("b", 0, 500)], {"a": 0, "b": 1}, {"a": 1000, "b": 1000})
        self.assertIn("[1:a]atrim", graph)

    def test_fades_never_exceed_a_quarter_of_a_tiny_segment(self):
        graph = build_filter([Segment("a", 0, 1)], {"a": 0}, {"a": 1})
        self.assertIn("afade=t=in:d=0.0003", graph)

    def test_no_segments_is_an_error(self):
        with self.assertRaises(ValueError):
            build_filter([], {}, {})


def fake_segment(*words):
    return SimpleNamespace(words=[SimpleNamespace(word=w, start=s, end=e, probability=p) for w, s, e, p in words])


class AsrWordsTest(unittest.TestCase):
    def test_flattens_and_strips_words(self):
        result = asr_words([fake_segment((" Hola", 0.0, 0.4, 0.9)), fake_segment((" mundo.", 0.5, 0.9, 0.8))])
        self.assertEqual(result, [AsrWord("Hola", 0, 400, 0.9), AsrWord("mundo.", 500, 900, 0.8)])

    def test_times_never_go_backwards_or_have_zero_length(self):
        result = asr_words([fake_segment(("a", 1.0, 1.0, None), ("b", 0.5, 0.6, None))])
        self.assertEqual([(w.start_ms, w.end_ms) for w in result], [(1000, 1010), (1010, 1020)])

    def test_skips_empty_words_and_segments_without_words(self):
        self.assertEqual(asr_words([fake_segment(("  ", 0, 1, 1.0)), SimpleNamespace(words=None)]), [])


if __name__ == "__main__":
    unittest.main()
