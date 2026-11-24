/**
 * Marks a value as a layout-only stand-in for `T`, handed to a skeleton's
 * `sample` prop so skullet can measure the real layout before any data has
 * loaded. Samples are never shown as content; they only need the fields the
 * view actually reads, so this skips filling in every optional API field.
 */
export function layoutSample<T>(value: unknown): T {
  return value as T;
}

/** `count` copies of `make(i)`, for repeated rows or cards in a sample. */
export function sampleRows<R>(count: number, make: (index: number) => R): R[] {
  return Array.from({ length: count }, (_, i) => make(i));
}
