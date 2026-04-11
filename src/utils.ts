import type { BeamInput } from './types';
import { TOLERANCE } from './constants';

export function distributedIntensityAt(
  x: number,
  dl: BeamInput['distributedLoads'][number]
): number {
  const a = dl.startPosition;
  const b = dl.endPosition;
  const len = b - a;
  if (Math.abs(len) < TOLERANCE) return dl.startMagnitude;
  if (x < Math.min(a, b) - TOLERANCE) return 0;
  if (x > Math.max(a, b) + TOLERANCE) return 0;
  const t = Math.max(0, Math.min(1, (x - a) / len));
  return dl.startMagnitude + (dl.endMagnitude - dl.startMagnitude) * t;
}