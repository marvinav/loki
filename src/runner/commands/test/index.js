import * as ramda from 'ramda';

import { ReferenceImageError } from '../../core/index.js';
import { warn, error } from '../../console.js';
import getConfig from '../../config/index.js';
import parseOptions from './parse-options.js';
import runTests from './run-tests.js';

async function test(args) {
  const config = getConfig();
  const options = parseOptions(args, config);

  const targetFilter = new RegExp(options.targetFilter);
  const configurationFilter = new RegExp(options.configurationFilter);
  const matchesFilters = ({ target }, name) =>
    targetFilter.test(target) && configurationFilter.test(name);

  const configurations = ramda.pickBy(matchesFilters, config.configurations);

  if (Object.keys(configurations).length === 0) {
    warn('No matching configurations');
    process.exit(0);
  }

  try {
    await runTests(configurations, options);
  } catch (err) {
    if (err.name === 'TaskRunnerError') {
      const imageErrors = err.errors.filter(
        (e) => e instanceof ReferenceImageError
      );
      if (imageErrors.length !== 0) {
        error('Visual tests failed');
      } else {
        error('Some visual tests failed to run');
      }
      process.exit(1);
    }
    throw err;
  }
}

export default test;
