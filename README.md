# AI Sprite Image Generator

Generate high-quality sprite images using Nano Banana Pro via [kie.ai](https://kie.ai).

Possibly the quickest, easiest and most cost-effective way to generate large batches of consistent images for logos, thumbnails, game assets, product photos, and more.

![AI Sprite Image Generator](docs/ai-sprite-image-generator.svg)

## Use Cases

- Logo designs
- Thumbnails
- Game assets
- Product photos
- Placeholder images for development

## Examples

|                                                    |                                                             |
| -------------------------------------------------- | ----------------------------------------------------------- |
| **Cats**                                           | **Product Photos**                                          |
| ![Cats](docs/examples/cats-image-sprite.png)       | ![Product Photos](docs/examples/furniture-image-sprite.png) |
| **Avatars**                                        | **Logos**                                                   |
| ![Avatars](docs/examples/avatars-image-sprite.png) | ![Logos](docs/examples/logos-image-sprite.png)              |

## Features

- 🚀 **Parallel batch processing** - Process multiple batches concurrently while respecting API rate limits
- 🔄 **Automatic retries** - Built-in retry logic with exponential backoff for failed requests
- ✂️ **Image splitting** - Automatically crops sprite sheets into individual images using sharp
- 📁 **Directory management** - Creates output directories automatically
- ⏱️ **Rate limiting** - Respects KIE API limits (20 requests per 10 seconds)
- 🎨 **Optimized prompts** - Automatically enhances your prompts for consistent sprite sheet generation
- 📝 **Comprehensive logging** - Detailed logs for debugging and monitoring

## Pricing Comparison

At time of writing:

- A single 1k image on [fal.ai](https://fal.ai/models/fal-ai/nano-banana-pro) costs **$0.15**
- A 4k 4096x4096px image on [kie.ai](https://kie.ai/pricing) costs **$0.12**

By generating a 5x5 sprite sheet using kie.ai we can generate 25 820x820px images for **$0.0048** each.

> [!TIP]
> That's 30x cheaper!

## Installation

```bash
bun add ai-sprite-image-generator
```

## Usage

### Basic Usage

```typescript
import { generateImages } from 'ai-sprite-image-generator';

const kieApiToken = 'your-kie-api-token';
const prompt = 'Photos of cats';

const result = await generateImages(kieApiToken, prompt);

console.log('Generated images:', result.imagePaths);

// Generated images: ['out/images/image-1.png', 'out/images/image-2.png', ...]
```

### With Named Items

To specify specific items for each cell, pass an array of strings. Requests will be batched based on the grid size (e.g. 5x5 = 25 items per batch):

```typescript
import { generateImages } from 'ai-sprite-image-generator';

const kieApiToken = 'your-kie-api-token';
const prompt = 'Furniture product photos';

const cells = ['Chair', 'Dinner Table', 'Sofa', 'Lamp', 'Bookshelf', 'Desk'];

const result = await generateImages(
  kieApiToken,
  prompt,
  {
    outputPath: './furniture',
  },
  cells,
);

console.log('Generated images:', result.imagePaths);
// Generated images: ['./furniture/images/chair.png', './furniture/images/dinner-table.png', ...]
```

## API Reference

### `generateImages(apiToken, prompt, options?, cells?)`

Main function to generate sprite images.

See [lib.ts](src/lib.ts) for full implementation.

**Parameters:**

- `apiToken` (string) - Your KIE AI API token - [Get one here](https://docs.kie.ai)
- `prompt` (string) - Base prompt describing the desired image style
- `options` (ImageGenerationOptions) - Optional configuration
- `cells` (string[] | CellDefinition[]) - Optional array of cell names or definitions

**Returns:** `Promise<ImageGenerationResult>`

### Types

```typescript
interface ImageGenerationOptions {
  rows: number; // Grid rows (default: 5)
  columns: number; // Grid columns (default: 5)
  outputPath: string; // Output directory (default: './out')
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
```

## License

MIT
