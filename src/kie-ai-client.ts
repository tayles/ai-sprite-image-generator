export type AspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9'
  | 'auto';

export type Resolution = '1K' | '2K' | '4K';

export type OutputFormat = 'png' | 'jpg';

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

/**
 * @see
 */
export async function createTask(
  payload: KieAiCreateTaskRequestBody,
  apiToken: string,
): Promise<KieAiCreateTaskResponse> {
  const response = await fetch('https://api.kie.ai/v1/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.statusText}`);
  }

  const data = await response.json();
  return data as KieAiCreateTaskResponse;
}

/**
 * @see https://docs.kie.ai/market/common/get-task-detail
 */
export async function pollTaskStatus(
  taskId: string,
  apiToken: string,
  maxAttempts: number = 60,
  interval: number = 5_000,
): Promise<KieAiImageGenerationResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    const result = (await response.json()) as KieAiTaskStatusResponse;
    const { state, resultJson, failMsg } = result.data;

    console.log(`Attempt ${attempt + 1}: State = ${state}`);

    if (state === 'success') {
      const results = JSON.parse(resultJson) as KieAiImageGenerationResult;
      console.log('✅ Task completed!');
      console.log('Results:', results.resultUrls);
      return results;
    }

    if (state === 'fail') {
      console.error('❌ Task failed:', failMsg);
      throw new Error(failMsg);
    }

    // Still processing, wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Task timed out after maximum attempts');
}

export interface KieAiApiImageGenerationOptions {
  checkFrequencySecs?: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
  model?: string;
}

export const DEFAULT_IMAGE_OPTIONS: KieAiApiImageGenerationOptions = {
  checkFrequencySecs: 5,
  aspectRatio: '1:1',
  resolution: '4K',
  outputFormat: 'png',
  model: 'nano-banana-pro',
};

export async function generateImage(
  prompt: string,
  apiToken: string,
  options: KieAiApiImageGenerationOptions,
): Promise<string> {
  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };

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

  const taskResponse = await createTask(payload, apiToken);
  const taskId = taskResponse.data.taskId;
  console.log(`Task created with ID: ${taskId}`);

  const result = await pollTaskStatus(taskId, apiToken, undefined, opts.checkFrequencySecs! * 1000);
  return result.resultUrls[0]!;
}
