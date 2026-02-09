import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

import {
  createTask,
  pollTaskStatus,
  type AspectRatio,
  type KieAiCreateTaskRequestBody,
  type OutputFormat,
  type Resolution,
} from './kie-ai-client';
import { RateLimiter, executeWithRateLimit } from './rate-limiter';
import { kebabCase } from './utils';

export interface ImageGenerationOptions {
  rows: number;
  columns: number;
  outputPath: string;
  existing: 'overwrite' | 'skip';

  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;

  /** Maximum concurrent batch requests (respects rate limits) */
  maxConcurrentBatches: number;
  /** Polling interval in milliseconds */
  pollIntervalMs: number;
  /** Maximum polling attempts per task */
  maxPollAttempts: number;
  /** Maximum retries for failed requests */
  maxRetries: number;
  /** Model to use for image generation */
  model: string;
}

export const DEFAULT_OPTIONS: ImageGenerationOptions = {
  rows: 5,
  columns: 5,
  outputPath: './out',
  existing: 'overwrite',

  aspectRatio: '1:1',
  resolution: '4K',
  outputFormat: 'png',

  maxConcurrentBatches: 10,
  pollIntervalMs: 5_000,
  maxPollAttempts: 60,
  maxRetries: 3,
  model: 'nano-banana-pro',
};

export interface CellDefinition {
  id: string;
  name: string;
}

export type CellDefinitions = string[] | CellDefinition[];

export interface BatchResult {
  batchIndex: number;
  batchImagePath: string;
  imagePaths: string[];
  cells: CellDefinition[];
  success: boolean;
  error?: Error;
}

export interface ImageGenerationResult {
  batchImagePaths: string[];
  imagePaths: string[];
  errors: Array<{ batchIndex: number; error: Error }>;
  totalBatches: number;
  successfulBatches: number;
}

/**
 * Builds an enhanced prompt for sprite sheet generation.
 * Ensures consistent, high-quality output without labels or grid lines.
 */
export function buildSpritePrompt(userPrompt: string, cellNames: string[]): string {
  const cellList = cellNames.map(name => `- ${name}`).join('\n');

  return `A ${cellNames.length <= 25 ? '5x5' : Math.ceil(Math.sqrt(cellNames.length)) + 'x' + Math.ceil(Math.sqrt(cellNames.length))} sprite sheet grid containing ${cellNames.length} distinct, isolated images.

CRITICAL REQUIREMENTS:
- Each cell contains ONLY the subject with NO text, labels, numbers, or annotations
- NO grid lines, borders, or cell dividers visible in the final image
- Each image is completely separate and self-contained within its grid cell
- Clean, consistent backgrounds across all cells
- Professional quality, sharp focus, high detail

STYLE:
${userPrompt}

SUBJECTS (one per cell, in reading order left-to-right, top-to-bottom):
${cellList}

Generate a seamless sprite sheet where each cell is visually distinct yet stylistically cohesive. No overlapping elements between cells. Equal spacing throughout.`.trim();
}

/**
 * Ensures the output directory exists, creating it if necessary.
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    console.log(`[FileSystem] Creating directory: ${dirPath}`);
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Downloads an image from a URL and saves it to a local file.
 */
export async function downloadImage(
  url: string,
  outputPath: string,
  maxRetries: number = 3,
): Promise<void> {
  await ensureDirectoryExists(dirname(outputPath));

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[Download] Fetching image from ${url} (attempt ${attempt + 1}/${maxRetries + 1})...`,
      );

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      await writeFile(outputPath, buffer);
      console.log(`[Download] ✅ Saved image to ${outputPath} (${buffer.length} bytes)`);
      return;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const waitTime = 1000 * 2 ** attempt;
        console.warn(
          `[Download] Failed: ${(error as Error).message}. Retrying in ${waitTime}ms...`,
        );
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError ?? new Error('Failed to download image after all retries');
}

/**
 * Splits a sprite sheet image into individual cell images using sharp.
 */
export async function splitSpriteSheet(
  spriteBuffer: Buffer,
  outputPath: string,
  filenames: string[] = [],
  outputFormat: OutputFormat,
  rows: number = 5,
  columns: number = 5,
): Promise<string[]> {
  await ensureDirectoryExists(outputPath);

  console.log(`[SpriteSheet] Splitting sprite into ${rows}x${columns} grid...`);

  const metadata = await sharp(spriteBuffer).metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error('Could not determine sprite sheet dimensions');
  }

  const cellWidth = Math.floor(width / columns);
  const cellHeight = Math.floor(height / rows);

  console.log(`[SpriteSheet] Image: ${width}x${height}, Cell size: ${cellWidth}x${cellHeight}`);

  const totalCells = rows * columns;
  const outputPaths: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const cellIndex = row * columns + col;

      // Skip if we've processed all named cells
      if (cellIndex >= totalCells) break;

      const filename = filenames[cellIndex] ?? `image-${cellIndex + 1}`;
      const cellOutputPath = join(outputPath, `${filename}.${outputFormat}`);

      const left = col * cellWidth;
      const top = row * cellHeight;

      try {
        await sharp(spriteBuffer)
          .extract({
            left,
            top,
            width: cellWidth,
            height: cellHeight,
          })
          .toFormat(outputFormat)
          .toFile(cellOutputPath);

        outputPaths.push(cellOutputPath);
        console.log(
          `[SpriteSheet] ✅ Saved cell ${cellIndex + 1}/${totalCells}: ${cellOutputPath}`,
        );
      } catch (error) {
        console.error(
          `[SpriteSheet] ❌ Failed to extract cell ${cellIndex + 1}: ${(error as Error).message}`,
        );
        throw error;
      }
    }
  }

  return outputPaths;
}

/**
 * Processes a single batch: creates task, polls for result, downloads image, splits into cells.
 */
async function processBatch(
  batchIndex: number,
  batchCells: CellDefinition[],
  apiToken: string,
  userPrompt: string,
  opts: ImageGenerationOptions,
  rateLimiter: RateLimiter,
): Promise<BatchResult> {
  const batchImgPath = join(
    opts.outputPath,
    'batches',
    `batch-${batchIndex + 1}.${opts.outputFormat}`,
  );

  // Check if batch image already exists (skip mode)
  if (opts.existing === 'skip' && existsSync(batchImgPath)) {
    console.log(`[Batch ${batchIndex + 1}] Image already exists, skipping generation...`);

    // Still need to split if individual images don't exist
    try {
      const { data: spriteBuffer } = await sharp(batchImgPath).toBuffer({
        resolveWithObject: true,
      });
      const imagePaths = await splitSpriteSheet(
        spriteBuffer,
        join(opts.outputPath, 'images'),
        batchCells.map(cell => cell.id),
        opts.outputFormat,
        opts.rows,
        opts.columns,
      );

      return {
        batchIndex,
        batchImagePath: batchImgPath,
        imagePaths,
        cells: batchCells,
        success: true,
      };
    } catch (error) {
      console.error(
        `[Batch ${batchIndex + 1}] Failed to process existing image: ${(error as Error).message}`,
      );
      // Continue to regenerate
    }
  }

  console.log(`[Batch ${batchIndex + 1}] Starting generation for ${batchCells.length} cells...`);

  // Build the optimized prompt
  const batchPrompt = buildSpritePrompt(
    userPrompt,
    batchCells.map(cell => cell.name),
  );

  // Acquire rate limit slot before creating task
  await rateLimiter.acquire();

  // Create the generation task
  const payload: KieAiCreateTaskRequestBody = {
    model: opts.model,
    callBackUrl: '',
    input: {
      prompt: batchPrompt,
      image_input: [],
      aspect_ratio: opts.aspectRatio,
      resolution: opts.resolution,
      output_format: opts.outputFormat,
    },
  };

  const taskResponse = await createTask(payload, apiToken, opts.maxRetries);
  const taskId = taskResponse.data.taskId;

  console.log(`[Batch ${batchIndex + 1}] Task created: ${taskId}`);

  // Poll for completion
  const result = await pollTaskStatus(taskId, apiToken, opts.maxPollAttempts, opts.pollIntervalMs);

  if (!result.resultUrls || result.resultUrls.length === 0) {
    throw new Error(`No image URLs returned for batch ${batchIndex + 1}`);
  }

  const imageUrl = result.resultUrls[0]!;
  console.log(`[Batch ${batchIndex + 1}] Image ready: ${imageUrl}`);

  // Download the sprite sheet
  await downloadImage(imageUrl, batchImgPath, opts.maxRetries);

  // Load the image for splitting
  const { data: spriteBuffer } = await sharp(batchImgPath).toBuffer({ resolveWithObject: true });

  // Split into individual images
  const imagePaths = await splitSpriteSheet(
    spriteBuffer,
    join(opts.outputPath, 'images'),
    batchCells.map(cell => cell.id),
    opts.outputFormat,
    opts.rows,
    opts.columns,
  );

  console.log(`[Batch ${batchIndex + 1}] ✅ Completed: ${imagePaths.length} images generated`);

  return {
    batchIndex,
    batchImagePath: batchImgPath,
    imagePaths,
    cells: batchCells,
    success: true,
  };
}

/**
 * Generates sprite sheet images from a prompt with optional cell definitions.
 * Supports parallel batch processing with rate limiting.
 *
 * @param apiToken - KIE API token
 * @param prompt - User prompt describing the desired image style
 * @param cells - Optional array of cell names or definitions
 * @param options - Generation options
 * @returns ImageGenerationResult with paths to generated images
 */
export async function generateImages(
  apiToken: string,
  prompt: string,
  cells?: CellDefinitions,
  options: Partial<ImageGenerationOptions> = {},
): Promise<ImageGenerationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  console.log(`[Generator] Starting image generation...`);
  console.log(
    `[Generator] Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
  );
  console.log(`[Generator] Options:`, {
    rows: opts.rows,
    columns: opts.columns,
    outputPath: opts.outputPath,
    existing: opts.existing,
    maxConcurrentBatches: opts.maxConcurrentBatches,
  });

  // Normalize cell definitions
  const cellDefs: CellDefinition[] =
    cells?.map(cell => {
      if (typeof cell === 'string') {
        return { id: kebabCase(cell), name: cell };
      }
      return cell;
    }) ?? [];

  // If no cells provided, generate a single sprite sheet with default naming
  const totalCells = opts.rows * opts.columns;
  if (cellDefs.length === 0) {
    for (let i = 0; i < totalCells; i++) {
      cellDefs.push({ id: `image-${i + 1}`, name: `Image ${i + 1}` });
    }
  }

  console.log(`[Generator] Processing ${cellDefs.length} cells in batches of ${totalCells}`);

  // Create output directories
  await ensureDirectoryExists(join(opts.outputPath, 'batches'));
  await ensureDirectoryExists(join(opts.outputPath, 'images'));

  // Split cells into batches
  const batches: CellDefinition[][] = [];
  for (let i = 0; i < cellDefs.length; i += totalCells) {
    batches.push(cellDefs.slice(i, i + totalCells));
  }

  console.log(`[Generator] Created ${batches.length} batch(es)`);

  // Create rate limiter (20 requests per 10 seconds)
  const rateLimiter = new RateLimiter(20, 10_000);

  // Create batch processing tasks
  const batchTasks = batches.map((batchCells, batchIndex) => async () => {
    try {
      return await processBatch(batchIndex, batchCells, apiToken, prompt, opts, rateLimiter);
    } catch (error) {
      console.error(`[Batch ${batchIndex + 1}] ❌ Failed: ${(error as Error).message}`);
      return {
        batchIndex,
        batchImagePath: '',
        imagePaths: [],
        cells: batchCells,
        success: false,
        error: error as Error,
      } as BatchResult;
    }
  });

  // Execute batches in parallel with rate limiting
  console.log(
    `[Generator] Processing ${batches.length} batches with max ${opts.maxConcurrentBatches} concurrent...`,
  );

  const results = await executeWithRateLimit<BatchResult>(
    batchTasks,
    rateLimiter,
    opts.maxConcurrentBatches,
  );

  // Aggregate results
  const batchImagePaths: string[] = [];
  const imagePaths: string[] = [];
  const errors: Array<{ batchIndex: number; error: Error }> = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const batchResult = result.value;
      if (batchResult.success) {
        batchImagePaths.push(batchResult.batchImagePath);
        imagePaths.push(...batchResult.imagePaths);
      } else if (batchResult.error) {
        errors.push({ batchIndex: batchResult.batchIndex, error: batchResult.error });
      }
    } else {
      errors.push({ batchIndex: -1, error: result.reason as Error });
    }
  }

  const elapsed = (Date.now() - startTime) / 1000;
  const successfulBatches = batches.length - errors.length;

  console.log(`[Generator] ✅ Completed in ${elapsed.toFixed(1)}s`);
  console.log(
    `[Generator] Results: ${successfulBatches}/${batches.length} batches, ${imagePaths.length} images`,
  );

  if (errors.length > 0) {
    console.warn(`[Generator] ⚠️ ${errors.length} batch(es) failed:`);
    for (const { batchIndex, error } of errors) {
      console.warn(`  - Batch ${batchIndex + 1}: ${error.message}`);
    }
  }

  return {
    batchImagePaths,
    imagePaths,
    errors,
    totalBatches: batches.length,
    successfulBatches,
  };
}
