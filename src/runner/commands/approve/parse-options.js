import path from 'path';
import minimist from 'minimist';
import defaults from '../test/default-options.json' with { type: 'json' };

function parseOptions(args, config) {
  const argv = minimist(args, { boolean: 'diffOnly' });

  const $ = (key) => argv[key] || config[key] || defaults[key];

  return {
    outputDir: path.resolve($('output')),
    differenceDir: path.resolve($('difference')),
    referenceDir: path.resolve($('reference')),
    // If --diffOnly was specified as a cli argument it should be used, otherwise config or default might overwrite it to true
    diffOnly: args.includes('--diffOnly') ? argv.diffOnly : $('diffOnly'),
  };
}

export default parseOptions;
