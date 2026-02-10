import { describe, expect, test } from 'bun:test';

import { parseArgs, parseCellList, showHelp, showVersion } from '../src/cli-utils';
import { DEFAULT_OPTIONS } from '../src/types';

describe('parseCellList', () => {
  test('parses comma-separated list', () => {
    const result = parseCellList('cat,dog,bird');
    expect(result).toEqual(['cat', 'dog', 'bird']);
  });

  test('parses newline-separated list', () => {
    const result = parseCellList('cat\ndog\nbird');
    expect(result).toEqual(['cat', 'dog', 'bird']);
  });

  test('parses mixed comma and newline', () => {
    const result = parseCellList('cat,dog\nbird,fish');
    expect(result).toEqual(['cat', 'dog', 'bird', 'fish']);
  });

  test('trims whitespace from items', () => {
    const result = parseCellList('  cat  ,  dog  ,  bird  ');
    expect(result).toEqual(['cat', 'dog', 'bird']);
  });

  test('filters out empty items', () => {
    const result = parseCellList('cat,,dog,\n\nbird');
    expect(result).toEqual(['cat', 'dog', 'bird']);
  });

  test('handles empty string', () => {
    const result = parseCellList('');
    expect(result).toEqual([]);
  });

  test('handles whitespace-only string', () => {
    const result = parseCellList('   \n   ,   ');
    expect(result).toEqual([]);
  });

  test('handles single item', () => {
    const result = parseCellList('cat');
    expect(result).toEqual(['cat']);
  });
});

describe('parseArgs', () => {
  test('parses prompt as first positional argument', () => {
    const result = parseArgs(['node', 'script', 'Photos of cats']);
    expect(result.prompt).toBe('Photos of cats');
  });

  test('parses --help flag', () => {
    const result = parseArgs(['node', 'script', '--help']);
    expect(result.help).toBe(true);
  });

  test('parses -h flag', () => {
    const result = parseArgs(['node', 'script', '-h']);
    expect(result.help).toBe(true);
  });

  test('parses --version flag', () => {
    const result = parseArgs(['node', 'script', '--version']);
    expect(result.version).toBe(true);
  });

  test('parses -v flag', () => {
    const result = parseArgs(['node', 'script', '-v']);
    expect(result.version).toBe(true);
  });

  test('parses --cells option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--cells', 'cat,dog,bird']);
    expect(result.cells).toEqual(['cat', 'dog', 'bird']);
  });

  test('parses -c option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-c', 'cat,dog']);
    expect(result.cells).toEqual(['cat', 'dog']);
  });

  test('parses --output option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--output', './custom']);
    expect(result.output).toBe('./custom');
  });

  test('parses -o option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-o', './out2']);
    expect(result.output).toBe('./out2');
  });

  test('parses --rows option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--rows', '3']);
    expect(result.rows).toBe(3);
  });

  test('parses -y option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-y', '4']);
    expect(result.rows).toBe(4);
  });

  test('parses --columns option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--columns', '6']);
    expect(result.columns).toBe(6);
  });

  test('parses -x option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-x', '4']);
    expect(result.columns).toBe(4);
  });

  test('parses --aspect-ratio option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--aspect-ratio', '16:9']);
    expect(result.aspectRatio).toBe('16:9');
  });

  test('parses -a option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-a', '4:3']);
    expect(result.aspectRatio).toBe('4:3');
  });

  test('parses --resolution option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--resolution', '2K']);
    expect(result.resolution).toBe('2K');
  });

  test('parses -r option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-r', '2K']);
    expect(result.resolution).toBe('2K');
  });

  test('parses --format option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--format', 'jpg']);
    expect(result.format).toBe('jpg');
  });

  test('parses -f option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-f', 'png']);
    expect(result.format).toBe('png');
  });

  test('parses --model option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--model', 'custom-model']);
    expect(result.model).toBe('custom-model');
  });

  test('parses -m option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-m', 'test-model']);
    expect(result.model).toBe('test-model');
  });

  test('parses --concurrency option', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--concurrency', '5']);
    expect(result.concurrency).toBe(5);
  });

  test('parses --existing option with overwrite', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--existing', 'overwrite']);
    expect(result.existing).toBe('overwrite');
  });

  test('parses --existing option with skip', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--existing', 'skip']);
    expect(result.existing).toBe('skip');
  });

  test('parses --quiet flag', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--quiet']);
    expect(result.quiet).toBe(true);
  });

  test('parses -q flag', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-q']);
    expect(result.quiet).toBe(true);
  });

  test('uses default values when not specified', () => {
    const result = parseArgs(['node', 'script', 'prompt']);
    expect(result.output).toBe(DEFAULT_OPTIONS.outputPath);
    expect(result.rows).toBe(DEFAULT_OPTIONS.rows);
    expect(result.columns).toBe(DEFAULT_OPTIONS.columns);
    expect(result.aspectRatio).toBe(DEFAULT_OPTIONS.aspectRatio);
    expect(result.resolution).toBe(DEFAULT_OPTIONS.resolution);
    expect(result.format).toBe(DEFAULT_OPTIONS.outputFormat);
    expect(result.model).toBe(DEFAULT_OPTIONS.model);
    expect(result.concurrency).toBe(DEFAULT_OPTIONS.maxConcurrentBatches);
    expect(result.quiet).toBe(false);
    expect(result.existing).toBe(DEFAULT_OPTIONS.existing);
    expect(result.cells).toEqual([]);
    expect(result.help).toBe(false);
    expect(result.version).toBe(false);
  });

  test('parses complex command with multiple options', () => {
    const result = parseArgs([
      'node',
      'script',
      'Furniture photos',
      '-c',
      'Chair,Table,Sofa',
      '-o',
      './furniture',
      '-x',
      '4',
      '-y',
      '3',
      '-a',
      '1:1',
      '--resolution',
      '4K',
      '-f',
      'png',
      '-q',
    ]);

    expect(result.prompt).toBe('Furniture photos');
    expect(result.cells).toEqual(['Chair', 'Table', 'Sofa']);
    expect(result.output).toBe('./furniture');
    expect(result.columns).toBe(4);
    expect(result.rows).toBe(3);
    expect(result.aspectRatio).toBe('1:1');
    expect(result.resolution).toBe('4K');
    expect(result.format).toBe('png');
    expect(result.quiet).toBe(true);
  });

  test('ignores invalid aspect ratio', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-a', 'invalid']);
    expect(result.aspectRatio).toBe(DEFAULT_OPTIONS.aspectRatio);
  });

  test('ignores invalid resolution', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--resolution', '8K']);
    expect(result.resolution).toBe(DEFAULT_OPTIONS.resolution);
  });

  test('ignores invalid format', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-f', 'gif']);
    expect(result.format).toBe(DEFAULT_OPTIONS.outputFormat);
  });

  test('ignores invalid rows value', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-y', 'abc']);
    expect(result.rows).toBe(DEFAULT_OPTIONS.rows);
  });

  test('ignores negative rows value', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-y', '-1']);
    expect(result.rows).toBe(DEFAULT_OPTIONS.rows);
  });

  test('ignores zero rows value', () => {
    const result = parseArgs(['node', 'script', 'prompt', '-y', '0']);
    expect(result.rows).toBe(DEFAULT_OPTIONS.rows);
  });

  test('ignores invalid existing value', () => {
    const result = parseArgs(['node', 'script', 'prompt', '--existing', 'delete']);
    expect(result.existing).toBe(DEFAULT_OPTIONS.existing);
  });

  test('handles empty argv', () => {
    const result = parseArgs(['node', 'script']);
    expect(result.prompt).toBeUndefined();
    expect(result.cells).toEqual([]);
  });

  test('handles missing option value gracefully', () => {
    // --cells at the end with no value
    const result = parseArgs(['node', 'script', 'prompt', '--cells']);
    expect(result.cells).toEqual([]);
  });
});

describe('showHelp', () => {
  test('outputs help text without throwing', () => {
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => {
      output += msg;
    };

    expect(() => showHelp()).not.toThrow();
    expect(output).toContain('ai-sprite-image-generator');
    expect(output).toContain('USAGE');
    expect(output).toContain('OPTIONS');
    expect(output).toContain('EXAMPLES');
    expect(output).toContain('KIE_API_KEY');

    console.log = originalLog;
  });
});

describe('showVersion', () => {
  test('outputs version without throwing', () => {
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => {
      output += msg;
    };

    expect(() => showVersion()).not.toThrow();
    expect(output).toMatch(/\d+\.\d+\.\d+/);

    console.log = originalLog;
  });
});
