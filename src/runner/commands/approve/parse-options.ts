import path from 'node:path';
import minimist from 'minimist';
import defaults from '../test/default-options.json' with { type: 'json' };

interface Config {
  output?: string;
  difference?: string;
  reference?: string;
  diffOnly?: boolean;
  [key: string]: unknown;
}

interface ApproveOptions {
  outputDir: string;
  differenceDir: string;
  referenceDir: string;
  diffOnly: boolean;
}

function parseOptions(args: string[], config: Config): ApproveOptions {
  const argv = minimist(args, { boolean: 'diffOnly' });

  const $ = (key: string): unknown =>
    argv[key] ?? config[key] ?? (defaults as Record<string, unknown>)[key];

  return {
    outputDir: path.resolve($('output') as string),
    differenceDir: path.resolve($('difference') as string),
    referenceDir: path.resolve($('reference') as string),
    // If --diffOnly was specified as a cli argument it should be used
    diffOnly: args.includes('--diffOnly')
      ? (argv.diffOnly as boolean)
      : ($('diffOnly') as boolean),
  };
}

export default parseOptions;
export type { ApproveOptions, Config };
