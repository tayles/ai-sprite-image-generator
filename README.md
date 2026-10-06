# AI Sprite Image Generator

![AI Sprite Image Generator](https://raw.githubusercontent.com/tayles/ai-sprite-image-generator/main/docs/ai-sprite-image-generator.svg)

A TypeScript library and CLI tool to generate high-quality sprite images using the leading AI image models (GPT Image 2.5, Grok Imagine, Nano Banana, Seedream, Qwen Image) via [kie.ai](https://kie.ai).

![AI Sprite Image Generator Workflow](https://raw.githubusercontent.com/tayles/ai-sprite-image-generator/main/docs/ai-sprite-image-generator-workflow.png)

Possibly the quickest, easiest and most cost-effective way to generate large batches of consistent images for logos, thumbnails, game assets, product photos, and more.

✨ Try it now with this one-liner:

```shell
KIE_API_KEY="your-kie-api-key" bunx ai-sprite-image-generator "Cat photos"
```

## Use Cases

Suitable for any scenario where density, speed and/or image consistency is preferable to raw image quality, such as:

- Logo or icon design ideas
- Thumbnails
- Game assets
- Product photos
- Placeholder images for development

## Examples

|                                                                                                                                        |                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Cats**                                                                                                                               | **Product Photos**                                                                                                                  |
| ![Cats](https://raw.githubusercontent.com/tayles/ai-sprite-image-generator/main/docs/examples/cats-image-sprite.jpg)                   | ![Product Photos](https://raw.githubusercontent.com/tayles/ai-sprite-image-generator/main/docs/examples/furniture-image-sprite.jpg) |
| **Avatars**                                                                                                                            | **Animals**                                                                                                                         |
| ![Avatars](https://raw.githubusercontent.com/tayles/ai-sprite-image-generator/main/docs/examples/avatars-image-sprite.jpg)             | ![Animals](https://raw.githubusercontent.com/tayles/ai-sprite-image-generator/main/docs/examples/animals-image-sprite.jpg)          |
| **Game Assets**                                                                                                                        | **Logo / Icon Design Ideas**                                                                                                        |
| ![Famous People](https://raw.githubusercontent.com/tayles/ai-sprite-image-generator/main/docs/examples/famous-people-image-sprite.jpg) | ![Logos](https://raw.githubusercontent.com/tayles/ai-sprite-image-generator/main/docs/examples/logos-image-sprite.jpg)              |

See [integration-test.ts](test/integration-test.ts) for example prompts and usage.

## Features

- 🚀 **Fast parallel batch processing** - Process batches concurrently to generate 100s of images in seconds
- ✂️ **Image splitting** - Automatically crops sprite sheets into individual images
- ⏱️ **Rate limiting** - Respects KIE AI API limits (20 requests per 10 seconds)
- 🎨 **Optimized prompts** - Automatically enhances your prompts for consistent sprite sheet generation
- 🖼️ **Output consistency** - Consistent art style between images
- 💰 **Cost effective** - Generate 25 images for the price of a single image on other platforms
- 🧠 **Multiple models** - Choose from the top-ranked image models, including GPT Image 2.5, Grok Imagine Image 2.0 and Nano Banana Pro

## Supported Models

Pick a model with `--model <id>` (CLI) or the `model` option (library). Run `ai-sprite-image-generator --list-models` to see each model's supported aspect ratios.

| Model                                                            | ID                       | Rank¹ | Max resolution | Price per sheet² | Price per image (5x5) |
| ---------------------------------------------------------------- | ------------------------ | ----- | -------------- | ---------------- | --------------------- |
| [GPT Image 2.5 Sunburst](https://kie.ai/gpt-image-2-5) (default) | `gpt-image-2.5-sunburst` | 1     | 4K             | $0.08            | $0.0032               |
| [GPT Image 2.5 Flare](https://kie.ai/gpt-image-2-5)              | `gpt-image-2.5-flare`    | 2     | 4K             | $0.08            | $0.0032               |
| [GPT Image 2](https://kie.ai/gpt-image-2)                        | `gpt-image-2`            | 3     | 4K³            | $0.08            | $0.0032               |
| [Grok Imagine Image 2.0](https://kie.ai/grok-imagine-image-2)    | `grok-imagine-image-2`   | 4     | Fixed          | $0.02            | $0.0008               |
| [Nano Banana 2](https://kie.ai/nano-banana-2)                    | `nano-banana-2`          | 6     | 4K             | $0.09            | $0.0036               |
| [Nano Banana Pro](https://kie.ai/nano-banana-pro)                | `nano-banana-pro`        | 11    | 4K             | $0.12            | $0.0048               |
| [Nano Banana 2 Lite](https://kie.ai/nano-banana-2-lite)          | `nano-banana-2-lite`     | 13    | 1K             | $0.02            | $0.0008               |
| [Qwen Image 3.0 Pro](https://kie.ai/qwen-image-3)                | `qwen-image-3-pro`       | 14    | 2K             | $0.06            | $0.0024               |
| [Seedream 5.0 Pro](https://kie.ai/seedream-5-0-pro)              | `seedream-5-pro`         | 15    | 2K             | $0.07            | $0.0028               |
| [Qwen Image 3.0](https://kie.ai/qwen-image-3)                    | `qwen-image-3`           | 16    | 2K             | $0.024           | $0.00096              |

1. Rank on the [Artificial Analysis text-to-image leaderboard](https://artificialanalysis.ai/image/leaderboard/text-to-image) (October 2026).
2. [kie.ai pricing](https://kie.ai/pricing) at the model's max resolution, October 2026. Lower resolutions are cheaper.
3. GPT Image 2 can't generate 1:1 images at 4K, so square sprite sheets are generated at 2K ($0.05).

If you ask for a resolution a model doesn't support, the highest supported resolution is used instead and a warning is logged. Models that can't output your chosen `--format` are converted locally.

## Pricing Comparison

Instead of paying for each image, we pay for one high-resolution sprite sheet on [kie.ai](https://kie.ai/pricing) and split it into 25 images (5x5 grid). A square 4K sheet gives you 25 images of roughly 576x576px each with GPT Image 2.5 (2880x2880px sheet), or 820x820px with Nano Banana Pro (4096x4096px sheet).

At time of writing (October 2026):

| Model                       | Single image elsewhere                                                              | Sprite sheet on kie.ai | Per image (5x5) | Saving  |
| --------------------------- | ----------------------------------------------------------------------------------- | ---------------------- | --------------- | ------- |
| GPT Image 2.5 Sunburst (4K) | $0.21 ([OpenAI API](https://artificialanalysis.ai/image/leaderboard/text-to-image)) | $0.08                  | **$0.0032**     | **66x** |
| Nano Banana Pro (4K)        | $0.15 ([fal.ai](https://fal.ai/models/fal-ai/nano-banana-pro), 1K)                  | $0.12                  | **$0.0048**     | **31x** |
| Grok Imagine Image 2.0      | $0.06 ([xAI API](https://artificialanalysis.ai/image/leaderboard/text-to-image))    | $0.02                  | **$0.0008**     | **75x** |

> [!TIP]
> With the default model (GPT Image 2.5 Sunburst), 100 images costs about **$0.32**. Generating each one individually through OpenAI would cost around **$21**.

## Installation

```shell
npm install ai-sprite-image-generator
```

```shell
pnpm add ai-sprite-image-generator
```

```shell
bun add ai-sprite-image-generator
```

## Usage

### CLI Usage

The package includes a CLI for quick image generation from the command line.

#### Installation

```shell
npm install -g ai-sprite-image-generator
```

Set your KIE AI API token as an environment variable:

```shell
export KIE_API_KEY="your-kie-api-key"
```

#### Basic Commands

```shell
# Generate 25 random images (5x5 grid)
ai-sprite-image-generator "Photos of cats"

# Generate specific named items
ai-sprite-image-generator "Furniture product photos" --cells "Chair,Table,Sofa,Lamp"
```

By default, your generated photos will be in `./out/`.

#### Reading Cells from Stdin

You can pipe cell names from a file or command (newline or comma-separated):

```shell
# From a file (one item per line)
cat items.txt | ai-sprite-image-generator "Product photos"

# From echo (comma-separated)
echo "Cat,Dog,Bird,Fish" | ai-sprite-image-generator "Animal avatars"
```

#### CLI Options

```shell
USAGE:
  ai-sprite-image-generator <prompt> [options]

OPTIONS:
  -c, --cells <items>      Comma or newline-separated list of cell names
  -o, --output <path>      Output directory (default: ./out)
  -x, --columns <n>        Grid columns (default: 5)
  -y, --rows <n>           Grid rows (default: 5)
  -a, --aspect-ratio <r>   Aspect ratio, e.g. 1:1, 3:2, 16:9 (default: 1:1, varies by model)
  -r, --resolution <r>     Resolution: 1K, 2K, 4K (default: 4K, or the model's max)
  -f, --format <fmt>       Output format: png, jpg (default: png)
  -m, --model <name>       AI model (default: gpt-image-2.5-sunburst), see Supported Models
  --list-models            List supported models with pricing and options
  --concurrency <n>        Max concurrent batches (default: 10)
  --existing <mode>        Handle existing files: overwrite, skip (default: overwrite)
  -q, --quiet              Suppress verbose output
  -h, --help               Show help message
  -v, --version            Show version number
```

#### CLI Examples

```shell
# Generate with custom grid size (3x3 = 9 images per batch)
ai-sprite-image-generator "Animal avatars" -x 3 -y 3

# Use Grok Imagine Image 2.0 (cheapest)
ai-sprite-image-generator "Game icons" -m grok-imagine-image-2

# Output to specific directory in JPG format
ai-sprite-image-generator "Logo designs" -o ./logos --format jpg

# Skip existing files instead of overwriting
ai-sprite-image-generator "Game assets" --existing skip

# Quiet mode (minimal output)
ai-sprite-image-generator "Thumbnails" -q
```

### TypeScript Library

#### Basic Usage

```typescript
import { generateImages } from 'ai-sprite-image-generator';

const kieApiKey = 'your-kie-api-key';

const prompt = 'Photos of cats';

const result = await generateImages(kieApiKey, prompt);

console.log('Generated images:', result.imagePaths);

// Generated images: ['out/images/image-1.png', 'out/images/image-2.png', ...]
```

#### With Named Items

To specify specific items for each cell, pass an array of strings. Requests will be batched based on the grid size (e.g. 5x5 = 25 items per batch):

```typescript
import { generateImages } from 'ai-sprite-image-generator';

const kieApiKey = 'your-kie-api-key';

const prompt = 'Furniture product photos';

const cells = ['Chair', 'Dinner Table', 'Sofa', 'Lamp', 'Bookshelf', 'Desk'];

const result = await generateImages(
  kieApiKey,
  prompt,
  {
    outputPath: './furniture',
  },
  cells,
);

console.log('Generated images:', result.imagePaths);
// Generated images: ['./furniture/images/chair.png', './furniture/images/dinner-table.png', ...]
```

#### API Reference

##### `generateImages(apiKey, prompt, options?, cells?)`

Main function to generate sprite images.

See [lib.ts](src/lib.ts) for full implementation.

**Parameters:**

- `apiKey` (string) - Your KIE AI API token - [Get one here](https://docs.kie.ai)
- `prompt` (string) - Base prompt describing the desired image style
- `options` (ImageGenerationOptions) - Optional configuration
- `cells` (string[] | CellDefinition[]) - Optional array of cell names or definitions

**Returns:** `Promise<ImageGenerationResult>`

##### Types

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
  model: string; // AI model id, see Supported Models (default: 'gpt-image-2.5-sunburst')
  verbose: boolean; // Enable console logging (default: true)
}

interface ImageGenerationResult {
  batchImagePaths: string[]; // Paths to sprite sheet images
  imagePaths: string[]; // Paths to individual cell images
  errors: Array<{ batchIndex: number; error: Error }>;
  totalBatches: number;
  successfulBatches: number;
}
```

## Contributing

Install dependencies:

```shell
bun install
```

Run lint/format/typecheck (and auto-fix where possible):

```shell
bun fix
```

Run tests:

```shell
bun test
```

Build package:

```shell
bun run build
```

## Maintainers

- [David Taylor](https://github.com/tayles)
