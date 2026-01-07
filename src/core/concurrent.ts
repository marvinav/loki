/**
 * Concurrency utilities replacing async.eachOfLimit.
 */

/**
 * Execute async operations with concurrency limit.
 * Similar to async.eachOfLimit but with Promises.
 *
 * @param items - Array of items to process
 * @param limit - Maximum concurrent operations
 * @param fn - Async function to execute for each item
 */
async function eachOfLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  const executing: Set<Promise<void>> = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;

    const promise = fn(item, i).then(() => {
      executing.delete(promise);
    });

    executing.add(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}

/**
 * Map over items with concurrency limit, returning results
 *
 * @param items - Array of items to process
 * @param limit - Maximum concurrent operations
 * @param fn - Async function to execute for each item
 * @returns Array of results in order
 */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Set<Promise<void>> = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const index = i;

    const promise = fn(item, index)
      .then((result) => {
        results[index] = result;
      })
      .finally(() => {
        executing.delete(promise);
      });

    executing.add(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Process items in batches
 *
 * @param items - Array of items to process
 * @param batchSize - Size of each batch
 * @param fn - Function to process each batch
 */
async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (batch: T[], batchIndex: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  for (let i = 0; i < batches.length; i++) {
    const result = await fn(batches[i]!, i);
    results.push(result);
  }

  return results;
}

export { eachOfLimit, mapLimit, processBatches };
