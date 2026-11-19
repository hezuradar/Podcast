"""Pure helpers for the worker (no I/O), unit-tested in tests/test_media.py."""

from __future__ import annotations

from dataclasses import dataclass

EDGE_PAD_MS = 30
"""Extra audio kept on each side of a cut: Whisper word times are often a little tight."""

MAX_FADE_S = 0.010
"""Short fade at every cut so joins do not click."""


@dataclass(frozen=True)
class Segment:
    asset_id: str
    in_ms: int
    out_ms: int


@dataclass(frozen=True)
class AsrWord:
    text: str
    start_ms: int
    end_ms: int
    confidence: float | None


def padded(segment: Segment, asset_duration_ms: int) -> tuple[int, int]:
    """Segment bounds with EDGE_PAD_MS on each side, clamped to the asset."""
    start = max(0, segment.in_ms - EDGE_PAD_MS)
    end = min(asset_duration_ms, segment.out_ms + EDGE_PAD_MS)
    return start, max(end, start + 1)


def build_filter(segments: list[Segment], input_index: dict[str, int], durations_ms: dict[str, int]) -> str:
    """ffmpeg filter graph: trim each segment from its input, fade its edges, concatenate in order."""
    if not segments:
        raise ValueError("No segments to render")
    parts: list[str] = []
    labels: list[str] = []
    for i, segment in enumerate(segments):
        start_ms, end_ms = padded(segment, durations_ms[segment.asset_id])
        length_s = (end_ms - start_ms) / 1000
        fade = min(MAX_FADE_S, length_s / 4)
        parts.append(
            f"[{input_index[segment.asset_id]}:a]"
            f"atrim=start={start_ms / 1000:.3f}:end={end_ms / 1000:.3f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:d={fade:.4f},afade=t=out:st={length_s - fade:.4f}:d={fade:.4f}[s{i}]"
        )
        labels.append(f"[s{i}]")
    parts.append(f"{''.join(labels)}concat=n={len(segments)}:v=0:a=1[out]")
    return ";\n".join(parts)


def asr_words(segments: list[object]) -> list[AsrWord]:
    """Flattens faster-whisper segments into clean words with positive, increasing times."""
    words: list[AsrWord] = []
    last_end = 0
    for segment in segments:
        for word in getattr(segment, "words", None) or []:
            text = str(word.word).strip()
            if not text:
                continue
            start = max(int(round(word.start * 1000)), last_end)
            end = max(int(round(word.end * 1000)), start + 10)
            probability = getattr(word, "probability", None)
            confidence = None if probability is None else max(0.0, min(1.0, float(probability)))
            words.append(AsrWord(text=text, start_ms=start, end_ms=end, confidence=confidence))
            last_end = end
    return words
