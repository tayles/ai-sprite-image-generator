import { createLogger, type Logger } from './utils';

/**
 * Rate limiter that enforces a maximum number of requests per time window.
 * Used to respect KIE API limits (20 requests per 10 seconds).
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly log: Logger;

  constructor(maxRequests: number = 20, windowMs: number = 10_000, log: Logger = createLogger()) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.log = log;
  }

  /**
   * Acquires a slot to make a request. If rate limit is hit, waits until a slot is available.
   */
  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove timestamps outside the current window
    this.timestamps = this.timestamps.filter(ts => now - ts < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      // Calculate wait time until oldest request expires
      const oldestTimestamp = this.timestamps[0]!;
      const waitTime = this.windowMs - (now - oldestTimestamp) + 10; // +10ms buffer

      this.log.log(
        `[RateLimiter] Rate limit reached. Waiting ${waitTime}ms before next request...`,
      );
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Recursively try again after waiting
      return this.acquire();
    }

    this.timestamps.push(Date.now());
  }

  /**
   * Returns the number of available request slots in the current window.
   */
  availableSlots(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(ts => now - ts < this.windowMs);
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }
}

/**
 * Executes tasks in parallel with rate limiting.
 * @param tasks Array of async task functions to execute
 * @param rateLimiter Rate limiter instance
 * @param concurrency Maximum number of concurrent tasks (for polling, not creation)
 */
export async function executeWithRateLimit<T>(
  tasks: (() => Promise<T>)[],
  rateLimiter: RateLimiter,
  concurrency: number = 10,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = Array.from({ length: tasks.length });
  const executing: Promise<void>[] = [];
  let index = 0;

  const runTask = async (taskIndex: number): Promise<void> => {
    await rateLimiter.acquire();
    const task = tasks[taskIndex]!;

    try {
      const result = await task();
      results[taskIndex] = { status: 'fulfilled', value: result };
    } catch (error) {
      results[taskIndex] = { status: 'rejected', reason: error };
    }
  };

  while (index < tasks.length) {
    // Start tasks up to concurrency limit
    while (executing.length < concurrency && index < tasks.length) {
      const taskIndex = index++;
      const promise = runTask(taskIndex).then(() => {
        const idx = executing.indexOf(promise);
        if (idx !== -1) void executing.splice(idx, 1);
      });
      executing.push(promise);
    }

    // Wait for at least one task to complete before starting more
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  // Wait for all remaining tasks to complete
  await Promise.all(executing);

  return results;
}
