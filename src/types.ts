import type { AspectRatio, Resolution, OutputFormat } from './kie-ai-client';

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
