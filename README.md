# ai-sprite-image-generator

Use Google Nano Banana Pro via [kie.ai](https://kie.ai) to generate sprite images.
This is a quick and cheap way to create lots of medium-resolution images quickly.

![AI Sprite Image Generator](docs/ai-sprite-image-generator.svg)

![AI Sprite Image Generator](docs/ai-sprite-image-generator2.svg)

## Pricing

At time of writing, a 4k 4096x4096px image costs **$0.12** (24 API credits - [source](https://kie.ai/pricing)).
By generating a 5x5 sprite sheet we can generate 25 820x820px images for **$0.0048** each.

## Use Cases

- Logo designs
- Thumbnails
- Game assets
- Placeholder images for development

## Features

- 🚀 **Parallel batch processing** - Process multiple batches concurrently while respecting API rate limits
- 🔄 **Automatic retries** - Built-in retry logic with exponential backoff for failed requests
- ✂️ **Image splitting** - Automatically crops sprite sheets into individual images using sharp
- 📁 **Directory management** - Creates output directories automatically
- ⏱️ **Rate limiting** - Respects KIE API limits (20 requests per 10 seconds)
- 🎨 **Optimized prompts** - Automatically enhances your prompts for consistent sprite sheet generation
- 📝 **Comprehensive logging** - Detailed logs for debugging and monitoring

## Installation

```bash
bun add ai-sprite-image-generator
```

## Usage

### Basic Usage

```typescript
import { generateImages } from 'ai-sprite-image-generator';

const kieApiToken = 'your-kie-api-token';
const prompt = 'Professional product photos on white background';

const result = await generateImages(kieApiToken, prompt);

console.log('Generated images:', result.imagePaths);
// Generated images: ['./out/images/image-1.png', './out/images/image-2.png', ...]
```

### With Named Cells

```typescript
import { generateImages } from 'ai-sprite-image-generator';

const kieApiToken = 'your-kie-api-token';
const prompt = 'Professional food photography, appetizing, studio lighting';

// Define specific items for each cell
const cells = ['Pizza', 'Burger', 'Salad', 'Pasta', 'Sushi'];

const result = await generateImages(kieApiToken, prompt, cells, {
  outputPath: './food-images',
  rows: 2,
  columns: 3,
});

console.log('Generated images:', result.imagePaths);
// Generated images: ['./food-images/images/pizza.png', './food-images/images/burger.png', ...]
```

### With Custom Options

```typescript
import { generateImages, type ImageGenerationOptions } from 'ai-sprite-image-generator';

const options: Partial<ImageGenerationOptions> = {
  rows: 5,
  columns: 5,
  outputPath: './sprites',
  existing: 'skip', // Skip regenerating if batch already exists
  aspectRatio: '1:1',
  resolution: '4K',
  outputFormat: 'png',
  maxConcurrentBatches: 5, // Process up to 5 batches in parallel
  pollIntervalMs: 5000, // Poll every 5 seconds
  maxPollAttempts: 60, // Max 60 attempts (5 minutes)
  maxRetries: 3, // Retry failed requests up to 3 times
  model: 'nano-banana-pro',
};

const result = await generateImages(token, prompt, cells, options);

console.log(`Generated ${result.imagePaths.length} images`);
console.log(`Batches: ${result.successfulBatches}/${result.totalBatches}`);

if (result.errors.length > 0) {
  console.warn('Some batches failed:', result.errors);
}
```

### Low-Level API Usage

```typescript
import {
  createTask,
  pollTaskStatus,
  downloadImage,
  splitSpriteSheet,
} from 'ai-sprite-image-generator';

// Create a task directly
const taskResponse = await createTask(
  {
    model: 'nano-banana-pro',
    callBackUrl: '',
    input: {
      prompt: 'Your prompt here',
      image_input: [],
      aspect_ratio: '1:1',
      resolution: '4K',
      output_format: 'png',
    },
  },
  apiToken,
);

// Poll for completion
const result = await pollTaskStatus(taskResponse.data.taskId, apiToken);

// Download the image
await downloadImage(result.resultUrls[0], './output/sprite.png');

// Split into individual images
const imagePaths = await splitSpriteSheet(
  spriteBuffer,
  './output/cells',
  ['cell-1', 'cell-2', 'cell-3'],
  'png',
  1,
  3,
);
```

## API Reference

### `generateImages(apiToken, prompt, cells?, options?)`

Main function to generate sprite images.

**Parameters:**

- `apiToken` (string) - Your KIE API token
- `prompt` (string) - Base prompt describing the desired image style
- `cells` (string[] | CellDefinition[]) - Optional array of cell names or definitions
- `options` (Partial<ImageGenerationOptions>) - Optional configuration

**Returns:** `Promise<ImageGenerationResult>`

### Types

```typescript
interface ImageGenerationOptions {
  rows: number; // Grid rows (default: 5)
  columns: number; // Grid columns (default: 5)
  outputPath: string; // Output directory (default: './out')
  existing: 'overwrite' | 'skip'; // How to handle existing files
  aspectRatio: AspectRatio; // Image aspect ratio (default: '1:1')
  resolution: Resolution; // Image resolution (default: '4K')
  outputFormat: OutputFormat; // Output format (default: 'png')
  maxConcurrentBatches: number; // Max parallel batches (default: 10)
  pollIntervalMs: number; // Polling interval (default: 5000)
  maxPollAttempts: number; // Max poll attempts (default: 60)
  maxRetries: number; // Max retries for failures (default: 3)
  model: string; // AI model to use (default: 'nano-banana-pro')
}

interface ImageGenerationResult {
  batchImagePaths: string[]; // Paths to sprite sheet images
  imagePaths: string[]; // Paths to individual cell images
  errors: Array<{ batchIndex: number; error: Error }>;
  totalBatches: number;
  successfulBatches: number;
}

interface CellDefinition {
  id: string; // Used for filename
  name: string; // Used in prompt
}
```

## Error Handling

The library provides specific error classes for different failure scenarios:

```typescript
import { KieApiError, TaskFailedError, TaskTimeoutError } from 'ai-sprite-image-generator';

try {
  const result = await generateImages(token, prompt, cells);
} catch (error) {
  if (error instanceof TaskTimeoutError) {
    console.error(`Task ${error.taskId} timed out after ${error.maxAttempts} attempts`);
  } else if (error instanceof TaskFailedError) {
    console.error(`Task ${error.taskId} failed: ${error.failMsg}`);
  } else if (error instanceof KieApiError) {
    console.error(`API error (${error.statusCode}): ${error.message}`);
  }
}
```

## Rate Limiting

The library automatically handles KIE API rate limits (20 requests per 10 seconds). The built-in `RateLimiter` ensures requests are throttled appropriately:

```typescript
import { RateLimiter, executeWithRateLimit } from 'ai-sprite-image-generator';

// Create a custom rate limiter
const limiter = new RateLimiter(20, 10_000); // 20 requests per 10 seconds

// Execute tasks with rate limiting
const tasks = items.map(item => async () => processItem(item));
const results = await executeWithRateLimit(tasks, limiter, 5); // max 5 concurrent
```

## License

MIT
