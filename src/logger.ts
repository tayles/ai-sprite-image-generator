import pc from 'picocolors';

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
    if (this.enabled) console.warn(pc.yellow(args.map(a => String(a)).join(' ')));
  }

  error(...args: unknown[]): void {
    if (this.enabled) console.error(pc.red(args.map(a => String(a)).join(' ')));
  }

  /**
   * Logs a fetch request with method and URL (dim styling).
   */
  fetch(method: string, url: string): void {
    if (this.enabled) console.log(pc.dim(`${method} ${url}`));
  }

  /**
   * Logs a success message with green checkmark.
   */
  success(message: string): void {
    if (this.enabled) console.log(`${pc.green('✓')} ${message}`);
  }
}

/**
 * Creates a new logger with the specified verbosity.
 */
export function createLogger(verbose: boolean = true): Logger {
  return new Logger(verbose);
}
