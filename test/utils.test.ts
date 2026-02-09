import { describe, expect, test } from 'bun:test';

import { kebabCase } from '../src/utils';

describe('kebabCase', () => {
  test('converts simple string', () => {
    expect(kebabCase('Hello World')).toBe('hello-world');
  });

  test('handles camelCase', () => {
    expect(kebabCase('helloWorld')).toBe('hello-world');
  });

  test('handles special characters', () => {
    expect(kebabCase('Hello, World!')).toBe('hello-world');
  });

  test('handles multiple spaces', () => {
    expect(kebabCase('Hello   World')).toBe('hello-world');
  });

  test('handles underscores', () => {
    expect(kebabCase('hello_world')).toBe('hello-world');
  });
});
