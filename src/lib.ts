import {
  generateImage,
  type AspectRatio,
  type OutputFormat,
  type Resolution,
} from './kie-ai-client';
import { kebabCase } from './utils';

export interface ImageGenerationOptions {
  rows: number;
  columns: number;
  outputPath: string;
  existing: 'overwrite' | 'skip';

  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
}

export const DEFAULT_OPTIONS: ImageGenerationOptions = {
  rows: 5,
  columns: 5,
  outputPath: './out',
  existing: 'overwrite',

  aspectRatio: '1:1',
  resolution: '4K',
  outputFormat: 'png',
};

export interface CellDefinition {
  id: string;
  name: string;
}

export type CellDefinitions = string[] | CellDefinition[];

export interface ImageGenerationResult {
  batchImagePaths: string[];
  imagePaths: string[];
}

export async function generateImages(
  apiToken: string,
  prompt: string,
  cells?: CellDefinitions,
  options: Partial<ImageGenerationOptions> = {},
): Promise<ImageGenerationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  console.log(`Generating images with prompt: "${prompt}" and options:`, opts);

  const cellDefs = cells?.map(cell => {
    if (typeof cell === 'string') {
      const id = kebabCase(cell);
      return { id, name: cell };
    }
    return cell;
  });

  console.log('Processed cell definitions:', cellDefs);

  const totalImages = opts.rows * opts.columns;

  const batches = cellDefs?.reduce<CellDefinition[][]>((acc, cell, index) => {
    const batchIndex = Math.floor(index / totalImages);
    if (!acc[batchIndex]) {
      acc[batchIndex] = [];
    }
    acc[batchIndex].push(cell);
    return acc;
  }, []) ?? [[]];

  for (const [batchIndex, batchCells] of batches.entries()) {
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} with cells:`, batchCells);

    const batchImgPath = `${opts.outputPath}/batch-${batchIndex + 1}.${opts.outputFormat}`;

    const batchPrompt = `${prompt}\n\n${batchCells.map(cell => `- ${cell.name}`).join('\n')}`;

    const imgUrl = await generateImage(batchPrompt, apiToken, {
      aspectRatio: opts.aspectRatio,
      resolution: opts.resolution,
      outputFormat: opts.outputFormat,
    });

    // fetch url and save to outputPath
    console.log(`Generated image for batch ${batchIndex + 1}: ${imgUrl}`);

    // split the image into individual cells and save to outputPath
    await splitSpriteSheet(
      batchImgPath,
      opts.outputPath,
      batchCells.map(cell => cell.id),
      opts.outputFormat,
      opts.rows,
      opts.columns,
    );
  }

  return {
    batchImagePaths: [], // Placeholder for generated batch image paths
    imagePaths: [], // Placeholder for generated individual image paths
  };
}

export async function splitSpriteSheet(
  spritePath: string,
  outputPath: string,
  filenames: string[] = [],
  outputFormat: OutputFormat,
  rows: number = 5,
  columns: number = 5,
): Promise<string[]> {}
