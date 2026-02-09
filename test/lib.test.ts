import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import sharp from 'sharp';

import {
  createTask,
  pollTaskStatus,
  KieApiError,
  TaskFailedError,
  TaskTimeoutError,
} from '../src/kie-ai-client';
import {
  buildSpritePrompt,
  downloadImage,
  ensureDirectoryExists,
  generateImages,
  splitSpriteSheet,
} from '../src/lib';
import { RateLimiter, executeWithRateLimit } from '../src/rate-limiter';
import { kebabCase } from '../src/utils';

// Store original fetch for restore
let originalFetch: typeof globalThis.fetch;

// Helper to mock fetch - uses type assertion to avoid TS errors
function setMockFetch(
  mockImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): void {
  // oxlint-ignore lint/suspicious/noExplicitAny: Test mock needs flexible typing
  (globalThis as any).fetch = mockImpl;
}

function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

// Helper to create a simple test image buffer
async function createTestSpriteBuffer(width = 500, height = 500): Promise<Buffer> {
  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();
}

describe('kebabCase', () => {
  test('converts simple string', () => {
    expect(kebabCase('Hello World')).toBe('hello-world');
  });

  test('handles camelCase', () => {
    expect(kebabCase('helloWorld')).toBe('hello-world');
  });

  test('handles special characters', () => {
    expect(kebabCase('Hello, World!')).toBe('hello-world');
  });

  test('handles multiple spaces', () => {
    expect(kebabCase('Hello   World')).toBe('hello-world');
  });

  test('handles underscores', () => {
    expect(kebabCase('hello_world')).toBe('hello-world');
  });
});

describe('buildSpritePrompt', () => {
  test('builds a valid sprite prompt', () => {
    const prompt = buildSpritePrompt('Professional photos', ['Cat', 'Dog', 'Bird']);

    expect(prompt).toContain('5x5 sprite sheet grid');
    expect(prompt).toContain('NO text, labels, numbers');
    expect(prompt).toContain('NO grid lines');
    expect(prompt).toContain('Professional photos');
    expect(prompt).toContain('- Cat');
    expect(prompt).toContain('- Dog');
    expect(prompt).toContain('- Bird');
  });

  test('includes all cell names', () => {
    const cellNames = Array.from({ length: 25 }, (_, i) => `Item ${i + 1}`);
    const prompt = buildSpritePrompt('Test prompt', cellNames);

    for (const name of cellNames) {
      expect(prompt).toContain(`- ${name}`);
    }
  });
});

describe('RateLimiter', () => {
  test('allows requests within limit', async () => {
    const limiter = new RateLimiter(5, 1000);

    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    const elapsed = Date.now() - start;

    // Should complete quickly without waiting
    expect(elapsed).toBeLessThan(100);
  });

  test('enforces rate limit', async () => {
    const limiter = new RateLimiter(2, 500);

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
    const limiter = new RateLimiter(5, 1000);

    expect(limiter.availableSlots()).toBe(5);

    await limiter.acquire();
    expect(limiter.availableSlots()).toBe(4);

    await limiter.acquire();
    expect(limiter.availableSlots()).toBe(3);
  });
});

describe('executeWithRateLimit', () => {
  test('executes all tasks', async () => {
    const limiter = new RateLimiter(10, 1000);
    const values = [1, 2, 3, 4, 5];
    const tasks = values.map(v => async () => v * 2);

    const results = await executeWithRateLimit(tasks, limiter);

    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
      .map(r => r.value);

    expect(fulfilled).toEqual([2, 4, 6, 8, 10]);
  });

  test('handles task failures', async () => {
    const limiter = new RateLimiter(10, 1000);
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
    const limiter = new RateLimiter(10, 1000);
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

describe('splitSpriteSheet', () => {
  test('splits sprite sheet into correct number of cells', async () => {
    const spriteBuffer = await createTestSpriteBuffer(500, 500);
    const tempDir = path.join('/tmp', 'test-sprite-split-' + Date.now());

    const paths = await splitSpriteSheet(spriteBuffer, tempDir, ['a', 'b', 'c', 'd'], 'png', 2, 2);

    expect(paths).toHaveLength(4);
    expect(paths[0]).toContain('a.png');
    expect(paths[1]).toContain('b.png');
    expect(paths[2]).toContain('c.png');
    expect(paths[3]).toContain('d.png');

    // Cleanup
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  test('uses default filenames when not provided', async () => {
    const spriteBuffer = await createTestSpriteBuffer(400, 400);
    const tempDir = path.join('/tmp', 'test-sprite-default-' + Date.now());

    const paths = await splitSpriteSheet(spriteBuffer, tempDir, [], 'png', 2, 2);

    expect(paths[0]).toContain('image-1.png');
    expect(paths[1]).toContain('image-2.png');

    // Cleanup
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  test('handles jpg output format', async () => {
    const spriteBuffer = await createTestSpriteBuffer(200, 200);
    const tempDir = path.join('/tmp', 'test-sprite-jpg-' + Date.now());

    const paths = await splitSpriteSheet(spriteBuffer, tempDir, ['test'], 'jpg', 1, 1);

    expect(paths[0]).toContain('test.jpg');

    // Cleanup
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });
});

describe('KIE API Client', () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('createTask', () => {
    test('creates task successfully', async () => {
      const mockResponse = {
        code: 0,
        msg: 'success',
        data: { taskId: 'test-task-123' },
      };

      setMockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      const result = await createTask(
        {
          model: 'nano-banana-pro',
          callBackUrl: '',
          input: {
            prompt: 'test prompt',
            image_input: [],
            aspect_ratio: '1:1',
            resolution: '4K',
            output_format: 'png',
          },
        },
        'test-api-token',
      );

      expect(result.data.taskId).toBe('test-task-123');
    });

    test('throws KieApiError on API error', async () => {
      const mockResponse = {
        code: 400,
        msg: 'Invalid request',
        data: null,
      };

      setMockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      await expect(
        createTask(
          {
            model: 'nano-banana-pro',
            callBackUrl: '',
            input: {
              prompt: 'test',
              image_input: [],
              aspect_ratio: '1:1',
              resolution: '4K',
              output_format: 'png',
            },
          },
          'test-token',
          0, // no retries
        ),
      ).rejects.toThrow(KieApiError);
    });

    test('retries on 429 rate limit', async () => {
      let callCount = 0;

      setMockFetch(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response('Rate limited', {
              status: 429,
              headers: { 'Retry-After': '1' },
            }),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              code: 0,
              msg: 'success',
              data: { taskId: 'retry-task' },
            }),
            { status: 200 },
          ),
        );
      });

      const result = await createTask(
        {
          model: 'nano-banana-pro',
          callBackUrl: '',
          input: {
            prompt: 'test',
            image_input: [],
            aspect_ratio: '1:1',
            resolution: '4K',
            output_format: 'png',
          },
        },
        'test-token',
        1,
      );

      expect(callCount).toBe(2);
      expect(result.data.taskId).toBe('retry-task');
    });
  });

  describe('pollTaskStatus', () => {
    test('returns result on success', async () => {
      const mockResult = { resultUrls: ['https://example.com/image.png'] };

      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: 0,
              data: {
                taskId: 'task-123',
                state: 'success',
                resultJson: JSON.stringify(mockResult),
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await pollTaskStatus('task-123', 'test-token', 5, 10);

      expect(result.resultUrls).toEqual(['https://example.com/image.png']);
    });

    test('throws TaskFailedError on failure', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: 0,
              data: {
                taskId: 'task-123',
                state: 'fail',
                failCode: 'ERR_001',
                failMsg: 'Generation failed',
              },
            }),
            { status: 200 },
          ),
        ),
      );

      await expect(pollTaskStatus('task-123', 'test-token', 5, 10)).rejects.toThrow(
        TaskFailedError,
      );
    });

    test('throws TaskTimeoutError on timeout', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: 0,
              data: {
                taskId: 'task-123',
                state: 'generating',
              },
            }),
            { status: 200 },
          ),
        ),
      );

      await expect(pollTaskStatus('task-123', 'test-token', 2, 10)).rejects.toThrow(
        TaskTimeoutError,
      );
    });

    test('polls multiple times until success', async () => {
      let callCount = 0;

      setMockFetch(() => {
        callCount++;
        const state = callCount < 3 ? 'generating' : 'success';
        const response = {
          code: 0,
          data: {
            taskId: 'task-123',
            state,
            resultJson:
              state === 'success'
                ? JSON.stringify({ resultUrls: ['https://example.com/done.png'] })
                : '',
          },
        };
        return Promise.resolve(new Response(JSON.stringify(response), { status: 200 }));
      });

      const result = await pollTaskStatus('task-123', 'test-token', 10, 10);

      expect(callCount).toBe(3);
      expect(result.resultUrls).toEqual(['https://example.com/done.png']);
    });
  });
});

describe('downloadImage', () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    restoreFetch();
  });

  test('downloads and saves image', async () => {
    const imageBuffer = await createTestSpriteBuffer(100, 100);
    const tempPath = path.join('/tmp', `test-download-${Date.now()}.png`);

    setMockFetch(() =>
      Promise.resolve(
        new Response(new Uint8Array(imageBuffer), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        }),
      ),
    );

    await downloadImage('https://example.com/image.png', tempPath, 0);

    expect(fs.existsSync(tempPath)).toBe(true);

    // Cleanup
    await fsPromises.unlink(tempPath);
  });

  test('retries on failure', async () => {
    let callCount = 0;
    const imageBuffer = await createTestSpriteBuffer(50, 50);
    const tempPath = path.join('/tmp', `test-retry-${Date.now()}.png`);

    setMockFetch(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response('Server Error', { status: 500 }));
      }
      return Promise.resolve(new Response(new Uint8Array(imageBuffer), { status: 200 }));
    });

    await downloadImage('https://example.com/image.png', tempPath, 1);

    expect(callCount).toBe(2);
    expect(fs.existsSync(tempPath)).toBe(true);

    // Cleanup
    await fsPromises.unlink(tempPath);
  });
});

describe('generateImages (integration)', () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    restoreFetch();
  });

  test('generates images for provided cells', async () => {
    const spriteBuffer = await createTestSpriteBuffer(500, 500);
    const tempDir = path.join('/tmp', `test-generate-${Date.now()}`);

    setMockFetch(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      // Create task endpoint
      if (url.includes('/v1/tasks')) {
        return new Response(
          JSON.stringify({
            code: 0,
            msg: 'success',
            data: { taskId: 'test-task-001' },
          }),
          { status: 200 },
        );
      }

      // Poll status endpoint
      if (url.includes('/jobs/recordInfo')) {
        return new Response(
          JSON.stringify({
            code: 0,
            data: {
              taskId: 'test-task-001',
              state: 'success',
              resultJson: JSON.stringify({
                resultUrls: ['https://example.com/sprite.png'],
              }),
            },
          }),
          { status: 200 },
        );
      }

      // Image download
      if (url.includes('example.com/sprite.png')) {
        return new Response(new Uint8Array(spriteBuffer), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      }

      return new Response('Not found', { status: 404 });
    });

    const result = await generateImages(
      'test-token',
      'Test photos',
      ['Cat', 'Dog', 'Bird', 'Fish'],
      {
        outputPath: tempDir,
        rows: 2,
        columns: 2,
        maxRetries: 0,
        pollIntervalMs: 10,
        maxPollAttempts: 5,
      },
    );

    expect(result.successfulBatches).toBe(1);
    expect(result.imagePaths.length).toBe(4);
    expect(result.errors.length).toBe(0);

    // Verify files were created
    expect(fs.existsSync(path.join(tempDir, 'images', 'cat.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'images', 'dog.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'images', 'bird.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'images', 'fish.png'))).toBe(true);

    // Cleanup
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  test('handles multiple batches', async () => {
    const spriteBuffer = await createTestSpriteBuffer(200, 200);
    const tempDir = path.join('/tmp', `test-batches-${Date.now()}`);
    let taskIdCounter = 0;

    setMockFetch(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/v1/tasks')) {
        taskIdCounter++;
        return new Response(
          JSON.stringify({
            code: 0,
            msg: 'success',
            data: { taskId: `task-${taskIdCounter}` },
          }),
          { status: 200 },
        );
      }

      if (url.includes('/jobs/recordInfo')) {
        return new Response(
          JSON.stringify({
            code: 0,
            data: {
              taskId: `task-${taskIdCounter}`,
              state: 'success',
              resultJson: JSON.stringify({
                resultUrls: ['https://example.com/sprite.png'],
              }),
            },
          }),
          { status: 200 },
        );
      }

      if (url.includes('example.com/sprite.png')) {
        return new Response(new Uint8Array(spriteBuffer), { status: 200 });
      }

      return new Response('Not found', { status: 404 });
    });

    // 6 cells with 2x2 grid = 2 batches (4 cells each max, so 4 + 2)
    const cells = ['A', 'B', 'C', 'D', 'E', 'F'];

    const result = await generateImages('test-token', 'Test', cells, {
      outputPath: tempDir,
      rows: 2,
      columns: 2,
      pollIntervalMs: 10,
      maxPollAttempts: 3,
    });

    expect(result.totalBatches).toBe(2);
    expect(result.successfulBatches).toBe(2);

    // Cleanup
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  test('uses skip mode correctly', async () => {
    const spriteBuffer = await createTestSpriteBuffer(200, 200);
    const tempDir = path.join('/tmp', `test-skip-${Date.now()}`);
    let apiCallCount = 0;

    // Pre-create the batch directory and file
    await fsPromises.mkdir(path.join(tempDir, 'batches'), { recursive: true });
    await fsPromises.mkdir(path.join(tempDir, 'images'), { recursive: true });
    await fsPromises.writeFile(path.join(tempDir, 'batches', 'batch-1.png'), spriteBuffer);

    setMockFetch(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/v1/tasks')) {
        apiCallCount++;
      }
      return new Response('Not found', { status: 404 });
    });

    const result = await generateImages('test-token', 'Test', ['A', 'B', 'C', 'D'], {
      outputPath: tempDir,
      rows: 2,
      columns: 2,
      existing: 'skip',
    });

    // API should not have been called since batch exists
    expect(apiCallCount).toBe(0);
    expect(result.successfulBatches).toBe(1);

    // Cleanup
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  test('reports errors correctly', async () => {
    const tempDir = path.join('/tmp', `test-errors-${Date.now()}`);

    setMockFetch(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/v1/tasks')) {
        return new Response(
          JSON.stringify({
            code: 0,
            msg: 'success',
            data: { taskId: 'fail-task' },
          }),
          { status: 200 },
        );
      }

      if (url.includes('/jobs/recordInfo')) {
        return new Response(
          JSON.stringify({
            code: 0,
            data: {
              taskId: 'fail-task',
              state: 'fail',
              failCode: 'ERR_001',
              failMsg: 'Generation failed',
            },
          }),
          { status: 200 },
        );
      }

      return new Response('Not found', { status: 404 });
    });

    const result = await generateImages('test-token', 'Test', ['A', 'B'], {
      outputPath: tempDir,
      rows: 1,
      columns: 2,
      pollIntervalMs: 10,
      maxPollAttempts: 2,
    });

    expect(result.errors.length).toBe(1);
    expect(result.successfulBatches).toBe(0);

    // Cleanup
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });
});

describe('ensureDirectoryExists', () => {
  test('creates directory if not exists', async () => {
    const testDir = path.join('/tmp', `test-dir-${Date.now()}`);

    expect(fs.existsSync(testDir)).toBe(false);
    await ensureDirectoryExists(testDir);
    expect(fs.existsSync(testDir)).toBe(true);

    // Cleanup
    await fsPromises.rm(testDir, { recursive: true, force: true });
  });

  test('does not error if directory exists', async () => {
    const testDir = path.join('/tmp', `test-existing-${Date.now()}`);
    await fsPromises.mkdir(testDir, { recursive: true });

    await expect(ensureDirectoryExists(testDir)).resolves.toBeUndefined();

    // Cleanup
    await fsPromises.rm(testDir, { recursive: true, force: true });
  });

  test('creates nested directories', async () => {
    const testDir = path.join('/tmp', `test-nested-${Date.now()}`, 'a', 'b', 'c');

    await ensureDirectoryExists(testDir);
    expect(fs.existsSync(testDir)).toBe(true);

    // Cleanup
    await fsPromises.rm(path.join('/tmp', `test-nested-${Date.now()}`), {
      recursive: true,
      force: true,
    });
  });
});
