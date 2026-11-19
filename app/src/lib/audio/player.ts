import type { Edl } from "../edl/edl";

const START_DELAY_S = 0.05;

/**
 * Plays an edit decision list with Web Audio: each segment of each source is scheduled back to back
 * on the audio clock, so cuts have no gaps. Sources are the light proxies decoded once.
 */
export class EdlPlayer {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private sources: AudioBufferSourceNode[] = [];
  private startedAt = 0;
  private fromMs = 0;

  private audio(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  async load(assetId: string, url: string): Promise<void> {
    if (this.buffers.has(assetId)) return;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar el audio (${response.status})`);
    const buffer = await this.audio().decodeAudioData(await response.arrayBuffer());
    this.buffers.set(assetId, buffer);
  }

  /** Starts playing the edit from `fromMs`; `onEnded` fires when the last segment finishes. */
  play(edl: Edl, fromMs: number, onEnded: () => void): void {
    this.stop();
    const context = this.audio();
    void context.resume();
    let when = context.currentTime + START_DELAY_S;
    this.startedAt = when;
    this.fromMs = fromMs;

    for (const segment of edl.segments) {
      const length = segment.outMs - segment.inMs;
      const offset = Math.max(0, fromMs - segment.startAtMs);
      const buffer = this.buffers.get(segment.assetId);
      if (offset >= length || !buffer) continue;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      const duration = (length - offset) / 1000;
      source.start(when, (segment.inMs + offset) / 1000, duration);
      when += duration;
      this.sources.push(source);
    }
    const last = this.sources.at(-1);
    if (last) last.onended = onEnded;
    else onEnded();
  }

  /** Position on the edited timeline while playing. */
  currentMs(): number {
    if (!this.context) return this.fromMs;
    return this.fromMs + Math.max(0, this.context.currentTime - this.startedAt) * 1000;
  }

  stop(): void {
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.sources = [];
  }
}
