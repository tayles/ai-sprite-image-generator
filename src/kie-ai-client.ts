import { createLogger, type Logger } from './logger';

export const ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
  'auto',
] as const;

export const RESOLUTIONS = ['1K', '2K', '4K'] as const;
export const OUTPUT_FORMATS = ['png', 'jpg'] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export type Resolution = (typeof RESOLUTIONS)[number];
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export interface KieAiCreateTaskRequestBody {
  model: string;
  callBackUrl: string;
  input: {
    prompt: string;
    image_input: string[];
    aspect_ratio: AspectRatio;
    resolution: Resolution;
    output_format: OutputFormat;
  };
}

export interface KieAiCreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface KieAiTaskStatusResponse {
  code: number;
  message: string;
  data: {
    taskId: string;
    model: string;
    state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
    param: string;
    resultJson: string;
    failCode: string;
    failMsg: string;
    completeTime: number;
    createTime: number;
    updateTime: number;
  };
}

export interface KieAiImageGenerationResult {
  resultUrls: string[];
}

export class KieApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'KieApiError';
  }
}

export class TaskTimeoutError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly maxAttempts: number,
  ) {
    super(`Task ${taskId} timed out after ${maxAttempts} polling attempts`);
    this.name = 'TaskTimeoutError';
  }
}

export class TaskFailedError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly failCode: string,
    public readonly failMsg: string,
  ) {
    super(`Task ${taskId} failed: ${failMsg} (code: ${failCode})`);
    this.name = 'TaskFailedError';
  }
}

/**
 * Delays execution for the specified number of milliseconds.
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay with jitter.
 */
function getBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
): number {
  const exponentialDelay = Math.min(maxDelay, baseDelay * 2 ** attempt);
  const jitter = exponentialDelay * 0.1 * Math.random();
  return exponentialDelay + jitter;
}

/**
 * Creates a new image generation task with retry logic.
 * @see https://docs.kie.ai/market/google/nano-banana
 */
export async function createTask(
  payload: KieAiCreateTaskRequestBody,
  apiKey: string,
  maxRetries: number = 3,
  log: Logger = createLogger(),
): Promise<KieAiCreateTaskResponse> {
  let lastError: Error | undefined;
  const url = 'https://api.kie.ai/api/v1/jobs/createTask';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      log.log(`Creating task (attempt ${attempt + 1}/${maxRetries + 1})...`);
      log.fetch('POST', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter
          ? Number.parseInt(retryAfter, 10) * 1000
          : getBackoffDelay(attempt);
        log.warn(`Rate limited (429). Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        continue;
      }

      // Handle server errors with retry
      if (response.status >= 500) {
        const waitTime = getBackoffDelay(attempt);
        log.warn(`Server error (${response.status}). Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new KieApiError(
          `Failed to create task: ${response.statusText} - ${errorBody}`,
          response.status,
          undefined,
          false,
        );
      }

      const data = (await response.json()) as KieAiCreateTaskResponse;

      if (data.code !== 0 && data.code !== 200) {
        throw new KieApiError(
          `API error: ${data.msg}`,
          response.status,
          data.code,
          data.code === 429,
        );
      }

      log.success(`Task created successfully: ${data.data.taskId}`);
      return data;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retryable errors
      if (error instanceof KieApiError && !error.retryable) {
        throw error;
      }

      if (attempt < maxRetries) {
        const waitTime = getBackoffDelay(attempt);
        log.warn(`Request failed: ${(error as Error).message}. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
      }
    }
  }

  throw lastError ?? new Error('Failed to create task after all retries');
}

/**
 * Polls for task completion status with retry logic.
 * @see https://docs.kie.ai/market/common/get-task-detail
 */
export async function pollTaskStatus(
  taskId: string,
  apiKey: string,
  maxAttempts: number = 60,
  interval: number = 5_000,
  log: Logger = createLogger(),
): Promise<KieAiImageGenerationResult> {
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5;
  const url = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      log.fetch('GET', url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle rate limiting during polling
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : interval * 2;
        log.warn(`Rate limited during polling. Waiting ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }

      if (!response.ok) {
        consecutiveErrors++;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new KieApiError(
            `Failed to poll task status after ${maxConsecutiveErrors} consecutive errors`,
            response.status,
          );
        }
        log.warn(`Poll request failed (${response.status}). Retrying...`);
        await delay(interval);
        continue;
      }

      // Reset consecutive error counter on successful request
      consecutiveErrors = 0;

      const result = (await response.json()) as KieAiTaskStatusResponse;
      const { state, resultJson, failMsg, failCode } = result.data;

      log.log(`Task ${taskId} - Attempt ${attempt + 1}: State = ${state}`);

      if (state === 'success') {
        const results = JSON.parse(resultJson) as KieAiImageGenerationResult;
        log.success(`Task ${taskId} completed! URLs: ${results.resultUrls.length}`);
        return results;
      }

      if (state === 'fail') {
        log.error(`❌ Task ${taskId} failed: ${failMsg}`);
        throw new TaskFailedError(taskId, failCode, failMsg);
      }

      // Still processing, wait before next poll
      await delay(interval);
    } catch (error) {
      // Re-throw known errors
      if (error instanceof TaskFailedError || error instanceof KieApiError) {
        throw error;
      }

      consecutiveErrors++;
      if (consecutiveErrors >= maxConsecutiveErrors) {
        throw new KieApiError(
          `Polling failed after ${maxConsecutiveErrors} consecutive errors: ${(error as Error).message}`,
        );
      }

      log.warn(`Poll error: ${(error as Error).message}. Retrying...`);
      await delay(interval);
    }
  }

  throw new TaskTimeoutError(taskId, maxAttempts);
}

export interface KieAiApiImageGenerationOptions {
  checkFrequencySecs?: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
  model?: string;
  verbose?: boolean;
}

export const DEFAULT_IMAGE_OPTIONS: KieAiApiImageGenerationOptions = {
  checkFrequencySecs: 5,
  aspectRatio: '1:1',
  resolution: '4K',
  outputFormat: 'png',
  model: 'nano-banana-pro',
  verbose: true,
};

export async function generateImage(
  prompt: string,
  apiKey: string,
  options: KieAiApiImageGenerationOptions,
): Promise<string> {
  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };
  const log = createLogger(opts.verbose);

  const payload: KieAiCreateTaskRequestBody = {
    model: opts.model!,
    callBackUrl: '',
    input: {
      prompt,
      image_input: [], // Add any image inputs if needed
      aspect_ratio: opts.aspectRatio,
      resolution: opts.resolution,
      output_format: opts.outputFormat,
    },
  };

  const taskResponse = await createTask(payload, apiKey, 3, log);
  const taskId = taskResponse.data.taskId;
  log.log(`Task created with ID: ${taskId}`);

  const result = await pollTaskStatus(
    taskId,
    apiKey,
    undefined,
    opts.checkFrequencySecs! * 1000,
    log,
  );
  return result.resultUrls[0]!;
}
