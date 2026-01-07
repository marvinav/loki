import path from 'node:path';
import minimist from 'minimist';
import defaults from './default-options.json' with { type: 'json' };

interface Config {
  [key: string]: unknown;
}

interface ParsedOptions {
  outputDir: string;
  referenceDir: string;
  differenceDir: string;
  storiesJsonPath: string | undefined;
  fileNameFormatter:
    | ((input: {
        configurationName: string;
        kind: string;
        story: string;
        parameters?: Record<string, unknown>;
      }) => string)
    | undefined;
  chromeConcurrency: number;
  chromeEnableAnimations: boolean;
  chromeFlags: string[];
  chromeLoadTimeout: number;
  chromeRetries: number;
  chromeSelector: string;
  chromeTolerance: number;
  chromeEmulatedMedia: string | undefined;
  skipStoriesPattern: string | undefined;
  storiesFilter: string | undefined;
  diffingEngine: string;
  fetchFailIgnore: string | undefined;
  'looks-same': Record<string, unknown>;
  gm: Record<string, unknown>;
  pixelmatch: Record<string, unknown>;
  verboseRenderer: boolean;
  silent: boolean;
  requireReference: boolean;
  updateReference: boolean;
  targetFilter: string | undefined;
  configurationFilter: string | undefined;
  passWithNoStories: boolean;
}

function parseOptions(args: string[], config: Config): ParsedOptions {
  const argv = minimist(args, {
    boolean: [
      'requireReference',
      'chromeEnableAnimations',
      'verboseRenderer',
      'passWithNoStories',
    ],
  });

  const $ = (key: string): unknown =>
    argv[key] ?? config[key] ?? (defaults as Record<string, unknown>)[key];

  return {
    outputDir: path.resolve($('output') as string),
    referenceDir: path.resolve($('reference') as string),
    differenceDir: path.resolve($('difference') as string),
    storiesJsonPath: $('stories')
      ? path.resolve($('stories') as string)
      : undefined,
    fileNameFormatter: config.fileNameFormatter as ParsedOptions['fileNameFormatter'],
    chromeConcurrency: parseInt($('chromeConcurrency') as string, 10),
    chromeEnableAnimations: $('chromeEnableAnimations') as boolean,
    chromeFlags: ($('chromeFlags') as string).split(' '),
    chromeLoadTimeout: parseInt($('chromeLoadTimeout') as string, 10),
    chromeRetries: parseInt($('chromeRetries') as string, 10),
    chromeSelector: $('chromeSelector') as string,
    chromeTolerance: parseFloat($('chromeTolerance') as string),
    chromeEmulatedMedia: $('chromeEmulatedMedia') as string | undefined,
    skipStoriesPattern: $('skipStories') as string | undefined,
    storiesFilter: $('storiesFilter') as string | undefined,
    diffingEngine: ($('diffingEngine') as string) || 'looks-same',
    fetchFailIgnore: $('fetchFailIgnore') as string | undefined,
    'looks-same': $('looks-same') as Record<string, unknown>,
    gm: $('gm') as Record<string, unknown>,
    pixelmatch: $('pixelmatch') as Record<string, unknown>,
    verboseRenderer: $('verboseRenderer') as boolean,
    silent: $('silent') as boolean,
    requireReference: $('requireReference') as boolean,
    updateReference: argv._[0] === 'update',
    targetFilter: argv.targetFilter as string | undefined,
    configurationFilter: (argv.configurationFilter ?? argv._[1]) as string | undefined,
    passWithNoStories: $('passWithNoStories') as boolean,
  };
}

export default parseOptions;
export type { ParsedOptions, Config };
