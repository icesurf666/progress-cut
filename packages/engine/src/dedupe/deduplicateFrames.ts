import type { FrameObservation } from '@progresscut/domain';
import { createProxy, type Proxy } from '../proxy/createProxy.js';
import { computeDHash, hammingDistance } from './dHash.js';
import { computePixelDiff } from './pixelDiff.js';
import { isDuplicateByDHash, isDuplicateByPixelDiff } from './isDuplicate.js';

export interface AnalyzedFrame {
  observation: FrameObservation;
  proxy: Proxy;
  visualDifference: number;
}

export interface DuplicateComparison {
  observation: FrameObservation;
  visualDifference: number;
  hammingDistance: number;
  duplicate: boolean;
}

export interface DeduplicationOptions {
  concurrency?: number;
  pixelDifferenceThreshold?: number;
  hashDistanceThreshold?: number;
  onComparison?: (comparison: DuplicateComparison) => void;
}

/** Bounded parallel image analysis followed by ordered, rolling comparison. */
export async function deduplicateFrames(
  observations: readonly FrameObservation[],
  options: DeduplicationOptions = {},
): Promise<AnalyzedFrame[]> {
  const concurrency = options.concurrency ?? 8;
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new RangeError('Concurrency must be a positive integer');
  const sorted = [...observations].sort((left, right) => left.timestampMs - right.timestampMs);
  const survivors: AnalyzedFrame[] = [];
  let reference: { proxy: Proxy; hash: bigint } | undefined;
  for (let offset = 0; offset < sorted.length; offset += concurrency) {
    // Release each batch after comparison rather than retaining proxies for discarded frames.
    const batch = await Promise.all(
      sorted.slice(offset, offset + concurrency).map(async (observation) => {
        const proxy = await createProxy(observation.sourcePath);
        const hash = await computeDHash(observation.sourcePath);
        return { observation, proxy, hash };
      }),
    );
    for (const frame of batch) {
      const visualDifference = reference ? computePixelDiff(frame.proxy, reference.proxy) : 0;
      const distance = reference ? hammingDistance(frame.hash, reference.hash) : 0;
      const duplicate =
        reference !== undefined &&
        isDuplicateByPixelDiff(visualDifference, options.pixelDifferenceThreshold ?? 0.005) &&
        isDuplicateByDHash(distance, options.hashDistanceThreshold ?? 3);
      if (reference)
        options.onComparison?.({
          observation: frame.observation,
          visualDifference,
          hammingDistance: distance,
          duplicate,
        });
      if (duplicate) continue;
      survivors.push({ observation: frame.observation, proxy: frame.proxy, visualDifference });
      reference = frame;
    }
  }
  return survivors;
}
