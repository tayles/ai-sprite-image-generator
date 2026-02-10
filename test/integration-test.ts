import { describe, expect, test } from 'bun:test';

import { generateImages, ImageGenerationOptions } from '../src';

describe.skip('manual integration tests', () => {
  const kieApiKey = process.env.KIE_API_KEY || '';

  if (!kieApiKey) {
    console.error('KIE_API_KEY environment variable is not set');
    process.exit(1);
  }

  const options: Partial<ImageGenerationOptions> = {
    outputPath: './out',
    outputFormat: 'jpg',
    verbose: true,
  };

  test('cat photos', async () => {
    const prompt = 'cat photos';

    const opts: Partial<ImageGenerationOptions> = { ...options, outputPath: './out/cats' };

    const res = await generateImages(kieApiKey, prompt, opts);

    expect(res.batchImagePaths).toBeDefined();
  });

  test('product photos', async () => {
    const prompt = 'product photos';

    const opts: Partial<ImageGenerationOptions> = { ...options, outputPath: './out/furniture' };

    const res = await generateImages(kieApiKey, prompt, opts);

    expect(res.batchImagePaths).toBeDefined();
  });

  test('avatars', async () => {
    const prompt = 'avatars';

    const opts: Partial<ImageGenerationOptions> = { ...options, outputPath: './out/avatars' };

    const res = await generateImages(kieApiKey, prompt, opts);

    expect(res.batchImagePaths).toBeDefined();
  });

  test('logos', async () => {
    const prompt = 'logos';

    const opts: Partial<ImageGenerationOptions> = { ...options, outputPath: './out/logos' };

    const res = await generateImages(kieApiKey, prompt, opts);

    expect(res.batchImagePaths).toBeDefined();
  });

  test('game assets', async () => {
    const prompt = `
    A high-quality 3D isometric game sprite sheet of a fantasy elf character running.
    The character is wearing a long flowing cape and holding a giant magical glowing sword.
    Distinct frames of a smooth running animation cycle in all directions.
    Vibrant colors, inticate details, clean outlines.
    The background is a solid, flat bright green color (chroma key).
    `;

    const opts: Partial<ImageGenerationOptions> = { ...options, outputPath: './out/game-assets' };

    const res = await generateImages(kieApiKey, prompt, opts);

    expect(res.batchImagePaths).toBeDefined();
  });
});
