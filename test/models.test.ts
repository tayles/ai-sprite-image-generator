import { describe, expect, test } from 'bun:test';

import { DEFAULT_MODEL, MODELS, getModel, getPrice, resolveModelInput } from '../src/models';

const baseOpts = {
  prompt: 'test prompt',
  aspectRatio: '1:1',
  resolution: '4K',
  outputFormat: 'png',
} as const;

describe('MODELS', () => {
  test('has unique ids and api model names', () => {
    expect(new Set(MODELS.map(m => m.id)).size).toBe(MODELS.length);
    expect(new Set(MODELS.map(m => m.apiModel)).size).toBe(MODELS.length);
  });

  test('includes the default model', () => {
    expect(getModel(DEFAULT_MODEL)).toBeDefined();
  });

  test('default model supports the default options without adjustments', () => {
    const { warnings } = resolveModelInput(DEFAULT_MODEL, baseOpts);
    expect(warnings).toEqual([]);
  });

  test('every model has pricing for each supported resolution', () => {
    for (const model of MODELS) {
      if (model.resolutions.length === 0) {
        expect(model.pricing.default).toBeGreaterThan(0);
      }
      for (const resolution of model.resolutions) {
        expect(model.pricing[resolution]).toBeGreaterThan(0);
      }
    }
  });

  test('every model supports a 1:1 aspect ratio', () => {
    for (const model of MODELS) {
      expect(model.aspectRatios).toContain('1:1');
    }
  });
});

describe('getModel', () => {
  test('finds a model by id', () => {
    expect(getModel('gpt-image-2.5-sunburst')?.apiModel).toBe(
      'gpt-image-2-5-sunburst-text-to-image',
    );
  });

  test('finds a model by api model name', () => {
    expect(getModel('grok-imagine-image-2-0/text-to-image')?.id).toBe('grok-imagine-image-2');
  });

  test('returns undefined for unknown models', () => {
    expect(getModel('not-a-model')).toBeUndefined();
  });
});

describe('getPrice', () => {
  test('returns the price for a resolution', () => {
    expect(getPrice(getModel('nano-banana-pro')!, '4K')).toBe(0.12);
  });

  test('returns the default price for fixed-size models', () => {
    expect(getPrice(getModel('grok-imagine-image-2')!)).toBe(0.02);
  });
});

describe('resolveModelInput', () => {
  test('builds nano banana pro input', () => {
    const { input, resolution, warnings } = resolveModelInput('nano-banana-pro', baseOpts);
    expect(input).toEqual({
      prompt: 'test prompt',
      image_input: [],
      aspect_ratio: '1:1',
      resolution: '4K',
      output_format: 'png',
    });
    expect(resolution).toBe('4K');
    expect(warnings).toEqual([]);
  });

  test('builds gpt image 2.5 input', () => {
    const { model, input } = resolveModelInput('gpt-image-2.5-flare', {
      ...baseOpts,
      aspectRatio: '16:9',
    });
    expect(model.apiModel).toBe('gpt-image-2-5-flare-text-to-image');
    expect(input).toEqual({ prompt: 'test prompt', aspect_ratio: '16:9', resolution: '4K' });
  });

  test('limits gpt image 2.5 to 1K for 1K-only aspect ratios', () => {
    const { input, warnings } = resolveModelInput('gpt-image-2.5-sunburst', {
      ...baseOpts,
      aspectRatio: '9:8',
    });
    expect(input.resolution).toBe('1K');
    expect(warnings.length).toBe(1);
  });

  test('limits gpt image 2 1:1 to 2K', () => {
    const { input, resolution, warnings } = resolveModelInput('gpt-image-2', baseOpts);
    expect(input.resolution).toBe('2K');
    expect(resolution).toBe('2K');
    expect(warnings.length).toBe(1);
  });

  test('limits gpt image 2 auto aspect ratio to 1K', () => {
    const { input } = resolveModelInput('gpt-image-2', { ...baseOpts, aspectRatio: 'auto' });
    expect(input.resolution).toBe('1K');
  });

  test('builds grok input without resolution', () => {
    const { input, resolution, warnings } = resolveModelInput('grok-imagine-image-2', baseOpts);
    expect(input).toEqual({ prompt: 'test prompt', aspect_ratio: '1:1' });
    expect(resolution).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  test('builds nano banana 2 lite input', () => {
    const { input, resolution } = resolveModelInput('nano-banana-2-lite', baseOpts);
    expect(input).toEqual({ prompt: 'test prompt', image_urls: [], aspect_ratio: '1:1' });
    expect(resolution).toBe('1K');
  });

  test('maps seedream resolution to quality and jpg to jpeg', () => {
    const { input, resolution } = resolveModelInput('seedream-5-pro', {
      ...baseOpts,
      outputFormat: 'jpg',
    });
    expect(input).toEqual({
      prompt: 'test prompt',
      aspect_ratio: '1:1',
      quality: 'high',
      output_format: 'jpeg',
    });
    expect(resolution).toBe('2K');
  });

  test('maps qwen aspect ratio to image_size', () => {
    const { input } = resolveModelInput('qwen-image-3-pro', { ...baseOpts, resolution: '1K' });
    expect(input).toEqual({
      prompt: 'test prompt',
      image_size: '1:1',
      resolution: '1K',
      output_format: 'png',
    });
  });

  test('throws for unknown models', () => {
    expect(() => resolveModelInput('not-a-model', baseOpts)).toThrow('Unknown model');
  });

  test('throws for unsupported aspect ratios', () => {
    expect(() =>
      resolveModelInput('grok-imagine-image-2', { ...baseOpts, aspectRatio: '21:9' }),
    ).toThrow('does not support aspect ratio');
  });
});
