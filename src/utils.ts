export function kebabCase(str: string): string {
  return str
    .replace(/\W/g, ' ') // Replace non-word characters with space
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Handle camelCase
    .trim()
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .toLowerCase();
}

/**
 * A simple logger that can be enabled/disabled via the verbose flag.
 * When disabled, all logging is suppressed.
 */
export class Logger {
  constructor(private readonly enabled: boolean = true) {}

  log(...args: unknown[]): void {
    if (this.enabled) console.log(...args);
  }

  warn(...args: unknown[]): void {
    if (this.enabled) console.warn(...args);
  }

  error(...args: unknown[]): void {
    if (this.enabled) console.error(...args);
  }

  /**
   * Logs a fetch request with method and URL.
   */
  fetch(method: string, url: string): void {
    if (this.enabled) console.log(`[Fetch] ${method} ${url}`);
  }
}

/** Shared global logger instance, defaults to verbose logging */
export let logger = new Logger(true);

/**
 * Creates a new logger with the specified verbosity.
 */
export function createLogger(verbose: boolean = true): Logger {
  return new Logger(verbose);
}
