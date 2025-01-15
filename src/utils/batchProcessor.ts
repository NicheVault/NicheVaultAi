// Create a new utility file for batch processing
export async function processBatchRequests<T>(
  items: any[],
  batchSize: number,
  processItem: (item: any) => Promise<T>
): Promise<T[]> {
  const results: T[] = [];
  const batches = Math.ceil(items.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = start + batchSize;
    const batch = items.slice(start, end);

    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    );

    results.push(...batchResults);
    
    // Add delay between batches to stay within rate limits
    if (i < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
} 