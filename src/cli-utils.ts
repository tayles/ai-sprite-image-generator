import type { ImageGenerationOptions } from './types';

import packageJson from '../package.json';
import {
  ASPECT_RATIOS,
  OUTPUT_FORMATS,
  RESOLUTIONS,
  type AspectRatio,
  type OutputFormat,
  type Resolution,
} from './kie-ai-client';
import { generateImages } from './lib';
import { DEFAULT_OPTIONS } from './types';

export interface CLIArgs {
  help: boolean;
  version: boolean;
  prompt?: string;
  cells: string[];
  output: string;
  rows: number;
  columns: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  format: OutputFormat;
  model: string;
  concurrency: number;
  quiet: boolean;
  existing: 'overwrite' | 'skip';
}

export function showHelp(): void {
  console.log(
    `
ai-sprite-image-generator - Generate sprite images using Nano Banana Pro via kie.ai

USAGE:
  ai-sprite-image-generator <prompt> [options]
  ai-sprite-image-generator <prompt> --cells "cat,dog,bird" [options]
  echo "cat\\ndog\\nbird" | ai-sprite-image-generator <prompt> [options]

ARGUMENTS:
  <prompt>                 Image generation prompt (required)

OPTIONS:
  -c, --cells <items>      Comma or newline-separated list of cell names
  -o, --output <path>      Output directory (default: ./out)
  -x, --columns <n>        Grid columns (default: 5)
  -y, --rows <n>           Grid rows (default: 5)
  -a, --aspect-ratio <r>   Aspect ratio: ${ASPECT_RATIOS.join(', ')} (default: 1:1)
  -r, --resolution <r>     Resolution: ${RESOLUTIONS.join(', ')} (default: 4K)
  -f, --format <fmt>       Output format: ${OUTPUT_FORMATS.join(', ')} (default: png)
  -m, --model <name>       AI model name (default: nano-banana-pro)
  --concurrency <n>        Max concurrent batches (default: 10)
  --existing <mode>        How to handle existing files: overwrite, skip (default: overwrite)
  -q, --quiet              Suppress verbose output
  -h, --help               Show this help message
  -v, --version            Show version number

ENVIRONMENT:
  KIE_API_TOKEN            KIE AI API token (required)

EXAMPLES:
  # Generate 25 random cat images
  ai-sprite-image-generator "Photos of cats"

  # Generate specific named items
  ai-sprite-image-generator "Furniture product photos" -c "Chair,Table,Sofa,Lamp"

  # Read cell names from stdin (newline-separated)
  cat items.txt | ai-sprite-image-generator "Game icons" -o ./icons

  # Generate with custom grid size
  ai-sprite-image-generator "Animal avatars" -x 3 -y 3
`.trim(),
  );
}

export function showVersion(): void {
  console.log(packageJson.version);
}

/**
 * Parse command line arguments into a structured object.
 */
export function parseArgs(argv: string[]): CLIArgs {
  const args = argv.slice(2); // Remove node and script path

  const result: CLIArgs = {
    help: false,
    version: false,
    prompt: undefined,
    cells: [],
    output: DEFAULT_OPTIONS.outputPath,
    rows: DEFAULT_OPTIONS.rows,
    columns: DEFAULT_OPTIONS.columns,
    aspectRatio: DEFAULT_OPTIONS.aspectRatio,
    resolution: DEFAULT_OPTIONS.resolution,
    format: DEFAULT_OPTIONS.outputFormat,
    model: DEFAULT_OPTIONS.model,
    concurrency: DEFAULT_OPTIONS.maxConcurrentBatches,
    quiet: false,
    existing: DEFAULT_OPTIONS.existing,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === undefined) {
      i++;
      continue;
    }

    if (arg === '-h' || arg === '--help') {
      result.help = true;
      i++;
    } else if (arg === '-v' || arg === '--version') {
      result.version = true;
      i++;
    } else if (arg === '-c' || arg === '--cells') {
      const value = args[++i];
      if (value) {
        result.cells = parseCellList(value);
      }
      i++;
    } else if (arg === '-o' || arg === '--output') {
      result.output = args[++i] ?? result.output;
      i++;
    } else if (arg === '-x' || arg === '--columns') {
      const value = parseInt(args[++i] ?? '', 10);
      if (!isNaN(value) && value > 0) {
        result.columns = value;
      }
      i++;
    } else if (arg === '-y' || arg === '--rows') {
      const value = parseInt(args[++i] ?? '', 10);
      if (!isNaN(value) && value > 0) {
        result.rows = value;
      }
      i++;
    } else if (arg === '-a' || arg === '--aspect-ratio') {
      const value = args[++i] as AspectRatio;
      if (ASPECT_RATIOS.includes(value)) {
        result.aspectRatio = value;
      }
      i++;
    } else if (arg === '-r' || arg === '--resolution') {
      const value = args[++i] as Resolution;
      if (RESOLUTIONS.includes(value)) {
        result.resolution = value;
      }
      i++;
    } else if (arg === '-f' || arg === '--format') {
      const value = args[++i] as OutputFormat;
      if (OUTPUT_FORMATS.includes(value)) {
        result.format = value;
      }
      i++;
    } else if (arg === '-m' || arg === '--model') {
      result.model = args[++i] ?? result.model;
      i++;
    } else if (arg === '--concurrency') {
      const value = parseInt(args[++i] ?? '', 10);
      if (!isNaN(value) && value > 0) {
        result.concurrency = value;
      }
      i++;
    } else if (arg === '--existing') {
      const value = args[++i];
      if (value === 'overwrite' || value === 'skip') {
        result.existing = value;
      }
      i++;
    } else if (arg === '-q' || arg === '--quiet') {
      result.quiet = true;
      i++;
    } else if (!arg.startsWith('-') && !result.prompt) {
      // First non-option argument is the prompt
      result.prompt = arg;
      i++;
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Parse a cell list from a string (comma or newline separated).
 */
export function parseCellList(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Read stdin if available (non-blocking check).
 */
export async function readStdin(): Promise<string | null> {
  // Check if stdin is a TTY (interactive terminal)
  if (process.stdin.isTTY) {
    return null;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    const timeout = setTimeout(() => {
      // If no data after a short delay, assume no stdin
      resolve(null);
    }, 100);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      clearTimeout(timeout);
      data += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timeout);
      resolve(data || null);
    });
    process.stdin.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });

    // Resume stdin to start reading
    process.stdin.resume();
  });
}

/**
 * Main CLI entry point.
 */
export async function runCLI(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    showHelp();
    return;
  }

  if (args.version) {
    showVersion();
    return;
  }

  // Read cells from stdin if not provided via args
  if (args.cells.length === 0) {
    const stdinData = await readStdin();
    if (stdinData) {
      args.cells = parseCellList(stdinData);
    }
  }

  // Validate required arguments
  if (!args.prompt) {
    console.error('Error: prompt is required');
    console.error('');
    showHelp();
    process.exit(1);
  }

  // Get API token from environment
  const apiToken = process.env.KIE_API_TOKEN;
  if (!apiToken) {
    console.error('Error: KIE_API_TOKEN environment variable is required');
    process.exit(1);
  }

  // Build options
  const options: Partial<ImageGenerationOptions> = {
    outputPath: args.output,
    rows: args.rows,
    columns: args.columns,
    aspectRatio: args.aspectRatio,
    resolution: args.resolution,
    outputFormat: args.format,
    model: args.model,
    maxConcurrentBatches: args.concurrency,
    verbose: !args.quiet,
    existing: args.existing,
  };

  // Run generation
  const cells = args.cells.length > 0 ? args.cells : undefined;

  if (!args.quiet) {
    console.log(`Generating images for prompt: "${args.prompt}"`);
    if (cells) {
      console.log(`Cells: ${cells.length} item(s)`);
    }
  }

  const result = await generateImages(apiToken, args.prompt, options, cells);

  // Output results
  if (!args.quiet) {
    console.log('');
    console.log(`✅ Generated ${result.imagePaths.length} images`);
    console.log(`   Batches: ${result.successfulBatches}/${result.totalBatches}`);
    console.log(`   Output: ${args.output}`);

    if (result.errors.length > 0) {
      console.log('');
      console.warn(`⚠️ ${result.errors.length} error(s):`);
      for (const { batchIndex, error } of result.errors) {
        console.warn(`   Batch ${batchIndex + 1}: ${error.message}`);
      }
    }
  }

  // Exit with error code if any batches failed
  if (result.errors.length > 0) {
    process.exit(1);
  }
}
