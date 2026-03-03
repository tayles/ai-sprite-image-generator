# AGENTS.md

`ai-sprite-image-generator` is a CLI tool and TypeScript library for generating sprite images using AI. It uses the https://kie.ai API to generate images using the nano banana pro image model.

## Commands

```sh
bun install          # Install dependencies
bun run build        # Build the CLI + TypeScript library
bun run test         # Run all tests (uses bun test)
bun fix              # Format, lint and type check all files (and autofix where possible)
```

Run tests for a single file:

```sh
bun test test/lib.test.ts
```

### Key Conventions

- Formatting: **oxfmt**; Linting: **oxlint** with `--type-aware`.
- Tests live alongside source files (`.test.ts`).
- Always use `bun` instead of `npm` or `pnpm`, and `bunx` instead of `npx`.
- Always use `bun fix` to autofix formatting + lint issues at the end of a task.
- Use `bun fix` to run type checking instead of `tsx --noEmit` or `bun typecheck`.
