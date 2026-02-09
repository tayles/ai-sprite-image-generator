import { describe, expect, test } from 'bun:test';

import {
  generateImages,
  splitSpriteSheet,
  DEFAULT_OPTIONS,
  KieApiError,
  TaskFailedError,
  TaskTimeoutError,
  createLogger,
  Logger,
} from '../src';

describe('exports', () => {
  test('exports all expected functions', () => {
    expect(typeof generateImages).toBe('function');
    expect(typeof splitSpriteSheet).toBe('function');
    expect(typeof createLogger).toBe('function');
  });

  test('exports all expected classes', () => {
    expect(typeof KieApiError).toBe('function');
    expect(typeof TaskTimeoutError).toBe('function');
    expect(typeof TaskFailedError).toBe('function');
    expect(typeof Logger).toBe('function');
  });

  test('exports DEFAULT_OPTIONS', () => {
    expect(DEFAULT_OPTIONS).toBeDefined();
    expect(DEFAULT_OPTIONS.rows).toBe(5);
    expect(DEFAULT_OPTIONS.columns).toBe(5);
    expect(DEFAULT_OPTIONS.outputFormat).toBe('png');
    expect(DEFAULT_OPTIONS.verbose).toBe(true);
  });
});
