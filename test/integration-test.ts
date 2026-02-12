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
    const prompt = 'isometric furniture product photos';

    const opts: Partial<ImageGenerationOptions> = { ...options, outputPath: './out/furniture' };

    const res = await generateImages(kieApiKey, prompt, opts);

    expect(res.batchImagePaths).toBeDefined();
  });

  test('avatars', async () => {
    const prompt = 'random social media avatars - some people, some cartoons, some abstract';

    const opts: Partial<ImageGenerationOptions> = { ...options, outputPath: './out/avatars' };

    const res = await generateImages(kieApiKey, prompt, opts);

    expect(res.batchImagePaths).toBeDefined();
  });

  test('logos', async () => {
    const prompt = 'logo design ideas for "AI Sprite Image Generator"';

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

  test('famous people', async () => {
    const prompt = `
    A high-quality 3D isometric game sprite sheet of famous historical figures.
    The background is a solid, flat white (#FFFFFF).
    `;

    const people = `
Alexander the Great
Julius Caesar
Cleopatra VII
Genghis Khan
Queen Elizabeth II
Napoleon Bonaparte
Abraham Lincoln
Queen Victoria
Winston Churchill
Nelson Mandela
Princess Diana
Albert Einstein
Marie Curie
Isaac Newton
Charles Darwin
Nikola Tesla
Galileo Galilei
Thomas Edison
Sigmund Freud
Stephen Hawking
Steve Jobs
William Shakespeare
Jane Austen
Charles Dickens
Mark Twain
George Orwell
Ernest Hemingway
Karl Marx
Confucius
Leonardo da Vinci
Vincent van Gogh
Pablo Picasso
Frida Kahlo
Wolfgang Amadeus Mozart
Ludwig van Beethoven
Alfred Hitchcock
Stanley Kubrick
Walt Disney
Marilyn Monroe
Charlie Chaplin
Elvis Presley
Paul McCartney
Audrey Hepburn
Bruce Lee
Michael Jackson
Mahatma Gandhi
Martin Luther King Jr.
Mother Teresa
Amelia Earhart
Neil Armstrong
    `
      .trim()
      .split('\n');

    const opts: Partial<ImageGenerationOptions> = { ...options, outputPath: './out/famous-people' };

    const res = await generateImages(kieApiKey, prompt, opts, people);

    expect(res.batchImagePaths).toBeDefined();
  });
});
