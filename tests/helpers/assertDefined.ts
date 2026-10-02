/** Narrow an expected fixture value while preserving a useful failure if it is missing. */
export function assertDefined<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error('Expected a defined fixture value');
  return value;
}
