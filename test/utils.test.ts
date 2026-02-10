import { describe, expect, test, spyOn } from 'bun:test';

import { createLogger, Logger } from '../src/logger';
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

describe('Logger', () => {
  test('logs when verbose is true', () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

    const log = createLogger(true);

    log.log('test log');
    log.warn('test warn');
    log.error('test error');
    log.fetch('GET', 'https://example.com');

    expect(logSpy).toHaveBeenCalledTimes(2); // log + fetch
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('does not log when verbose is false', () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

    const log = createLogger(false);

    log.log('test log');
    log.warn('test warn');
    log.error('test error');
    log.fetch('GET', 'https://example.com');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('defaults to verbose true', () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    const log = createLogger();
    log.log('test');

    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  test('Logger class defaults to enabled', () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    const log = new Logger();
    log.log('test');

    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  test('fetch logs method and URL', () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    const log = createLogger(true);
    log.fetch('POST', 'https://api.example.com/tasks');

    expect(logSpy).toHaveBeenCalled();
    // The output includes ANSI color codes, so we check the call contains the key parts
    const callArg = logSpy.mock.calls[0]?.[0] as string;
    expect(callArg).toContain('POST');
    expect(callArg).toContain('https://api.example.com/tasks');

    logSpy.mockRestore();
  });
});
