import { describe, expect, test } from 'bun:test';

import { RateLimiter, executeWithRateLimit } from '../src/rate-limiter';
import { createLogger } from '../src/utils';

// Silent logger for tests
const log = createLogger(false);

describe('RateLimiter', () => {
  test('allows requests within limit', async () => {
    const limiter = new RateLimiter(5, 1000, log);

    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    const elapsed = Date.now() - start;

    // Should complete quickly without waiting
    expect(elapsed).toBeLessThan(100);
  });

  test('enforces rate limit', async () => {
    const limiter = new RateLimiter(2, 500, log);

    // Use up the limit
    await limiter.acquire();
    await limiter.acquire();

    const start = Date.now();
    await limiter.acquire(); // Should wait
    const elapsed = Date.now() - start;

    // Should have waited at least some time
    expect(elapsed).toBeGreaterThanOrEqual(400);
  });

  test('reports available slots correctly', async () => {
    const limiter = new RateLimiter(5, 1000, log);

    expect(limiter.availableSlots()).toBe(5);

    await limiter.acquire();
    expect(limiter.availableSlots()).toBe(4);

    await limiter.acquire();
    expect(limiter.availableSlots()).toBe(3);
  });
});

describe('executeWithRateLimit', () => {
  test('executes all tasks', async () => {
    const limiter = new RateLimiter(10, 1000, log);
    const values = [1, 2, 3, 4, 5];
    const tasks = values.map(v => async () => v * 2);

    const results = await executeWithRateLimit(tasks, limiter);

    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
      .map(r => r.value);

    expect(fulfilled).toEqual([2, 4, 6, 8, 10]);
  });

  test('handles task failures', async () => {
    const limiter = new RateLimiter(10, 1000, log);
    const tasks = [
      async () => 1,
      async () => {
        throw new Error('Task failed');
      },
      async () => 3,
    ];

    const results = await executeWithRateLimit(tasks, limiter);

    expect(results[0]?.status).toBe('fulfilled');
    expect(results[1]?.status).toBe('rejected');
    expect(results[2]?.status).toBe('fulfilled');
  });

  test('respects concurrency limit', async () => {
    const limiter = new RateLimiter(10, 1000, log);
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const tasks = Array.from({ length: 10 }, () => async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await new Promise(resolve => setTimeout(resolve, 50));
      currentConcurrent--;
      return true;
    });

    await executeWithRateLimit(tasks, limiter, 3);

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});
