import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  createTask,
  pollTaskStatus,
  KieApiError,
  TaskFailedError,
  TaskTimeoutError,
} from '../src/kie-ai-client';

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
