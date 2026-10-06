import type { AspectRatio, OutputFormat, Resolution } from './kie-ai-client';

/**
 * Generic generation options that are mapped onto each model's own input schema.
 */
export interface ModelInputOptions {
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
}

export interface ModelInput {
  /** Model-specific `input` payload for the kie.ai createTask endpoint */
  input: Record<string, unknown>;
  /** Resolution that will actually be generated (`undefined` if the model has a fixed output size) */
  resolution?: Resolution;
  /** Non-fatal adjustments made to fit the model's constraints */
  warnings: string[];
}

export interface ModelDefinition {
  /** Short id used with the `model` option / `--model` flag */
  id: string;
  /** Model name expected by the kie.ai API */
  apiModel: string;
  name: string;
  provider: string;
  aspectRatios: readonly AspectRatio[];
  /** Supported resolutions, lowest first. Empty if the model has a fixed output size. */
  resolutions: readonly Resolution[];
  /** kie.ai price in USD per generated image, keyed by resolution (or `default` for fixed-size models) */
  pricing: Partial<Record<Resolution | 'default', number>>;
  docsUrl: string;
  buildInput: (opts: ModelInputOptions) => ModelInput;
}

/**
 * Picks the highest supported resolution that does not exceed the requested one,
 * falling back to the lowest supported resolution.
 */
function clampResolution(
  requested: Resolution,
  supported: readonly Resolution[],
  warnings: string[],
  modelName: string,
): Resolution {
  if (supported.includes(requested)) return requested;
  const order: Resolution[] = ['1K', '2K', '4K'];
  const fallback =
    [...supported].reverse().find(r => order.indexOf(r) < order.indexOf(requested)) ??
    supported[0]!;
  warnings.push(`${modelName} does not support ${requested} here, using ${fallback} instead`);
  return fallback;
}

function toJpegName(format: OutputFormat): 'png' | 'jpeg' {
  return format === 'jpg' ? 'jpeg' : format;
}

const NANO_BANANA_ASPECT_RATIOS = [
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
] as const satisfies readonly AspectRatio[];

const NANO_BANANA_2_ASPECT_RATIOS = [
  ...NANO_BANANA_ASPECT_RATIOS,
  '1:4',
  '4:1',
  '1:8',
  '8:1',
] as const satisfies readonly AspectRatio[];

const GPT_IMAGE_2_5_ASPECT_RATIOS = [
  'auto',
  '1:1',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '21:9',
  '27:16',
  '16:27',
  '9:8',
  '8:9',
] as const satisfies readonly AspectRatio[];

const GPT_IMAGE_2_ASPECT_RATIOS = [
  'auto',
  '1:1',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '5:4',
  '4:5',
  '16:9',
  '9:16',
  '2:1',
  '1:2',
  '3:1',
  '1:3',
  '21:9',
  '9:21',
] as const satisfies readonly AspectRatio[];

const QWEN_3_ASPECT_RATIOS = [
  '1:1',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '21:9',
] as const satisfies readonly AspectRatio[];

/**
 * @see https://docs.kie.ai/market/gpt/gpt-image-2-5-sunburst-text-to-image
 */
function gptImage25(id: string, variant: 'sunburst' | 'flare', name: string): ModelDefinition {
  const def: ModelDefinition = {
    id,
    apiModel: `gpt-image-2-5-${variant}-text-to-image`,
    name,
    provider: 'OpenAI',
    aspectRatios: GPT_IMAGE_2_5_ASPECT_RATIOS,
    resolutions: ['1K', '2K', '4K'],
    pricing: { '1K': 0.03, '2K': 0.05, '4K': 0.08 },
    docsUrl: `https://docs.kie.ai/market/gpt/gpt-image-2-5-${variant}-text-to-image`,
    buildInput: ({ prompt, aspectRatio, resolution }) => {
      const warnings: string[] = [];
      // These aspect ratios are only available at 1K
      const oneKOnly = ['27:16', '16:27', '9:8', '8:9'].includes(aspectRatio);
      const res = clampResolution(
        resolution,
        oneKOnly ? ['1K'] : def.resolutions,
        warnings,
        `${name} (${aspectRatio})`,
      );
      return {
        input: { prompt, aspect_ratio: aspectRatio, resolution: res },
        resolution: res,
        warnings,
      };
    },
  };
  return def;
}

const gptImage2: ModelDefinition = {
  id: 'gpt-image-2',
  apiModel: 'gpt-image-2-text-to-image',
  name: 'GPT Image 2',
  provider: 'OpenAI',
  aspectRatios: GPT_IMAGE_2_ASPECT_RATIOS,
  resolutions: ['1K', '2K', '4K'],
  pricing: { '1K': 0.03, '2K': 0.05, '4K': 0.08 },
  docsUrl: 'https://docs.kie.ai/market/gpt/gpt-image-2-text-to-image',
  buildInput: ({ prompt, aspectRatio, resolution }) => {
    const warnings: string[] = [];
    let supported: Resolution[];
    if (aspectRatio === 'auto' || ['3:1', '1:3', '9:21'].includes(aspectRatio)) {
      supported = ['1K'];
    } else if (aspectRatio === '1:1') {
      supported = ['1K', '2K'];
    } else if (['5:4', '4:5'].includes(aspectRatio)) {
      supported = ['1K', '4K'];
    } else {
      supported = ['1K', '2K', '4K'];
    }
    const res = clampResolution(resolution, supported, warnings, `GPT Image 2 (${aspectRatio})`);
    return {
      input: { prompt, aspect_ratio: aspectRatio, resolution: res },
      resolution: res,
      warnings,
    };
  },
};

/**
 * Supported models, ordered by Artificial Analysis text-to-image leaderboard ranking.
 * @see https://artificialanalysis.ai/image/leaderboard/text-to-image
 * @see https://kie.ai/pricing
 */
export const MODELS: readonly ModelDefinition[] = [
  gptImage25('gpt-image-2.5-sunburst', 'sunburst', 'GPT Image 2.5 Sunburst'),
  gptImage25('gpt-image-2.5-flare', 'flare', 'GPT Image 2.5 Flare'),
  gptImage2,
  {
    id: 'grok-imagine-image-2',
    apiModel: 'grok-imagine-image-2-0/text-to-image',
    name: 'Grok Imagine Image 2.0',
    provider: 'xAI',
    aspectRatios: ['1:1', '2:3', '3:2', '16:9', '9:16'],
    resolutions: [],
    pricing: { default: 0.02 },
    docsUrl: 'https://docs.kie.ai/market/grok-imagine-image-2-0/text-to-image',
    buildInput: ({ prompt, aspectRatio }) => ({
      input: { prompt, aspect_ratio: aspectRatio },
      warnings: [],
    }),
  },
  {
    id: 'nano-banana-2',
    apiModel: 'nano-banana-2',
    name: 'Nano Banana 2',
    provider: 'Google',
    aspectRatios: NANO_BANANA_2_ASPECT_RATIOS,
    resolutions: ['1K', '2K', '4K'],
    pricing: { '1K': 0.04, '2K': 0.06, '4K': 0.09 },
    docsUrl: 'https://docs.kie.ai/market/google/nanobanana2',
    buildInput: ({ prompt, aspectRatio, resolution, outputFormat }) => ({
      input: {
        prompt,
        image_input: [],
        aspect_ratio: aspectRatio,
        resolution,
        output_format: outputFormat,
      },
      resolution,
      warnings: [],
    }),
  },
  {
    id: 'nano-banana-pro',
    apiModel: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    provider: 'Google',
    aspectRatios: NANO_BANANA_ASPECT_RATIOS,
    resolutions: ['1K', '2K', '4K'],
    pricing: { '1K': 0.09, '2K': 0.09, '4K': 0.12 },
    docsUrl: 'https://docs.kie.ai/market/google/pro-image-to-image',
    buildInput: ({ prompt, aspectRatio, resolution, outputFormat }) => ({
      input: {
        prompt,
        image_input: [],
        aspect_ratio: aspectRatio,
        resolution,
        output_format: outputFormat,
      },
      resolution,
      warnings: [],
    }),
  },
  {
    id: 'nano-banana-2-lite',
    apiModel: 'nano-banana-2-lite',
    name: 'Nano Banana 2 Lite',
    provider: 'Google',
    aspectRatios: NANO_BANANA_2_ASPECT_RATIOS,
    resolutions: ['1K'],
    pricing: { '1K': 0.02 },
    docsUrl: 'https://docs.kie.ai/market/google/nano-banana-2-lite',
    buildInput: ({ prompt, aspectRatio, resolution }) => {
      const warnings: string[] = [];
      const res = clampResolution(resolution, ['1K'], warnings, 'Nano Banana 2 Lite');
      return {
        input: { prompt, image_urls: [], aspect_ratio: aspectRatio },
        resolution: res,
        warnings,
      };
    },
  },
  {
    id: 'qwen-image-3-pro',
    apiModel: 'qwen3/pro-text-to-image',
    name: 'Qwen Image 3.0 Pro',
    provider: 'Alibaba',
    aspectRatios: QWEN_3_ASPECT_RATIOS,
    resolutions: ['1K', '2K'],
    pricing: { '1K': 0.032, '2K': 0.06 },
    docsUrl: 'https://docs.kie.ai/market/qwen3-pro/text-to-image',
    buildInput: ({ prompt, aspectRatio, resolution, outputFormat }) => {
      const warnings: string[] = [];
      const res = clampResolution(resolution, ['1K', '2K'], warnings, 'Qwen Image 3.0 Pro');
      return {
        input: {
          prompt,
          image_size: aspectRatio,
          resolution: res,
          output_format: toJpegName(outputFormat),
        },
        resolution: res,
        warnings,
      };
    },
  },
  {
    id: 'seedream-5-pro',
    apiModel: 'seedream/5-pro-text-to-image',
    name: 'Seedream 5.0 Pro',
    provider: 'ByteDance',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'],
    resolutions: ['1K', '2K'],
    pricing: { '1K': 0.035, '2K': 0.07 },
    docsUrl: 'https://docs.kie.ai/market/seedream/5-pro-text-to-image',
    buildInput: ({ prompt, aspectRatio, resolution, outputFormat }) => {
      const warnings: string[] = [];
      const res = clampResolution(resolution, ['1K', '2K'], warnings, 'Seedream 5.0 Pro');
      return {
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          // `basic` outputs 1K images, `high` outputs 2K images
          quality: res === '2K' ? 'high' : 'basic',
          output_format: toJpegName(outputFormat),
        },
        resolution: res,
        warnings,
      };
    },
  },
  {
    id: 'qwen-image-3',
    apiModel: 'qwen3/text-to-image',
    name: 'Qwen Image 3.0',
    provider: 'Alibaba',
    aspectRatios: QWEN_3_ASPECT_RATIOS,
    resolutions: ['1K', '2K'],
    pricing: { '1K': 0.024, '2K': 0.024 },
    docsUrl: 'https://docs.kie.ai/market/qwen3/text-to-image',
    buildInput: ({ prompt, aspectRatio, resolution, outputFormat }) => {
      const warnings: string[] = [];
      const res = clampResolution(resolution, ['1K', '2K'], warnings, 'Qwen Image 3.0');
      return {
        input: {
          prompt,
          image_size: aspectRatio,
          resolution: res,
          output_format: toJpegName(outputFormat),
        },
        resolution: res,
        warnings,
      };
    },
  },
];

export const DEFAULT_MODEL = 'nano-banana-pro';

/**
 * Looks up a model by its short id or kie.ai API model name.
 */
export function getModel(idOrApiModel: string): ModelDefinition | undefined {
  return MODELS.find(m => m.id === idOrApiModel || m.apiModel === idOrApiModel);
}

/**
 * Resolves a model and maps the generic options onto its input schema.
 * Throws if the model is unknown or the aspect ratio is not supported by the model.
 */
export function resolveModelInput(
  model: string,
  opts: ModelInputOptions,
): ModelInput & { model: ModelDefinition } {
  const def = getModel(model);
  if (!def) {
    throw new Error(
      `Unknown model "${model}". Supported models: ${MODELS.map(m => m.id).join(', ')}`,
    );
  }
  if (!def.aspectRatios.includes(opts.aspectRatio)) {
    throw new Error(
      `${def.name} does not support aspect ratio "${opts.aspectRatio}". Supported: ${def.aspectRatios.join(', ')}`,
    );
  }
  return { ...def.buildInput(opts), model: def };
}

/**
 * Returns the kie.ai price in USD for a single generation, or `undefined` if unknown.
 */
export function getPrice(model: ModelDefinition, resolution?: Resolution): number | undefined {
  return (resolution && model.pricing[resolution]) ?? model.pricing.default;
}
