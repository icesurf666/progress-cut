import { hammingDistance } from '@progresscut/engine';

// Frames with distance below STAGNANT are considered unchanged;
// above ACTIVE indicate significant screen change.
const STAGNANT_DISTANCE = 5;
const ACTIVE_DISTANCE   = 20;

// Multiplier bounds: slow down up to 3× when idle, speed up to 0.5× when active.
const MULTIPLIER_MAX = 3.0;
const MULTIPLIER_MIN = 0.5;

// Growth/decay rates for the multiplier.
const STAGNANT_GROWTH = 1.25; // 25% slower per idle frame
const ACTIVE_DECAY    = 0.75; // 25% faster per active frame
const DRIFT_RATE      = 0.2;  // exponential drift toward 1× when change is moderate

export class AdaptiveInterval {
  private multiplier = 1;
  private previousHash: bigint | null = null;

  constructor(private readonly baseIntervalMs: number) {}

  update(hash: bigint | null): number {
    if (hash !== null && this.previousHash !== null) {
      const distance = hammingDistance(hash, this.previousHash);
      if (distance < STAGNANT_DISTANCE)
        this.multiplier = Math.min(MULTIPLIER_MAX, this.multiplier * STAGNANT_GROWTH);
      else if (distance > ACTIVE_DISTANCE)
        this.multiplier = Math.max(MULTIPLIER_MIN, this.multiplier * ACTIVE_DECAY);
      else
        this.multiplier += (1 - this.multiplier) * DRIFT_RATE;
    }
    if (hash !== null) this.previousHash = hash;
    return Math.round(this.baseIntervalMs * this.multiplier);
  }
}
