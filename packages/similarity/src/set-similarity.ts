/**
 * Jaccard similarity between two sets: |A ∩ B| / |A ∪ B|.
 * Returns a value in [0, 1]; empty sets are treated as fully dissimilar (0).
 */
export function jaccard<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  const intersection = intersectionSize(a, b);
  const union = a.size + b.size - intersection;

  return union === 0 ? 0 : intersection / union;
}

/**
 * Cosine similarity over binary set membership: |A ∩ B| / sqrt(|A| * |B|).
 */
export function cosine<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  return intersectionSize(a, b) / Math.sqrt(a.size * b.size);
}

export function intersectionSize<T>(
  a: ReadonlySet<T>,
  b: ReadonlySet<T>,
): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let count = 0;

  for (const value of small) {
    if (large.has(value)) {
      count += 1;
    }
  }

  return count;
}
