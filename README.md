# ai-sprite-image-generator

Use Google Nano Banana Pro via [kie.ai](https://kie.ai) to generate sprite images.
This is a quick and cheap way to create lots of medium-resolution images quickly.

## Pricing

At time of writing, a 4k 4096x4096px image costs **$0.12** (24 API credits - [source](https://kie.ai/pricing)).
By generating a 5x5 sprite sheet we can generate 25 820x820px images for **$0.0048** each.

## Installation

```bash
bun add ai-sprite-image-generator
```

## Usage

```typescript
import { generateImages } from 'ai-sprite-image-generator';

const kieApiToken = 'your-kie-api-token';
const prommpt = 'photos of cats';

generateImages(kieApiToken, prommpt);
```
