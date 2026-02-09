import { describe, expect, test } from 'bun:test';

import {
  generateImages,
  downloadImage,
  splitSpriteSheet,
  buildSpritePrompt,
  ensureDirectoryExists,
  createTask,
  pollTaskStatus,
  KieApiError,
  TaskTimeoutError,
  TaskFailedError,
  RateLimiter,
  executeWithRateLimit,
  kebabCase,
  DEFAULT_OPTIONS,
} from '../src';

describe('exports', () => {
  test('exports all expected functions', () => {
    expect(typeof generateImages).toBe('function');
    expect(typeof downloadImage).toBe('function');
    expect(typeof splitSpriteSheet).toBe('function');
    expect(typeof buildSpritePrompt).toBe('function');
    expect(typeof ensureDirectoryExists).toBe('function');
    expect(typeof createTask).toBe('function');
    expect(typeof pollTaskStatus).toBe('function');
    expect(typeof kebabCase).toBe('function');
    expect(typeof executeWithRateLimit).toBe('function');
  });

  test('exports all expected classes', () => {
    expect(typeof KieApiError).toBe('function');
    expect(typeof TaskTimeoutError).toBe('function');
    expect(typeof TaskFailedError).toBe('function');
    expect(typeof RateLimiter).toBe('function');
  });

  test('exports DEFAULT_OPTIONS', () => {
    expect(DEFAULT_OPTIONS).toBeDefined();
    expect(DEFAULT_OPTIONS.rows).toBe(5);
    expect(DEFAULT_OPTIONS.columns).toBe(5);
    expect(DEFAULT_OPTIONS.outputFormat).toBe('png');
  });
});
