import { ReferenceImageError, pickBy } from '../../../core/index.js';
import { warn, error } from '../../console.js';
import getConfig from '../../config/index.js';
import parseOptions from './parse-options.js';
import runTests from './run-tests.js';
import { TaskRunnerError } from './task-runner.js';

interface Configuration {
  target: string;
  [key: string]: unknown;
}

async function test(args: string[]): Promise<void> {
  const config = getConfig();
  const options = parseOptions(args, config);

  const targetFilter = new RegExp(options.targetFilter ?? '');
  const configurationFilter = new RegExp(options.configurationFilter ?? '');

  const matchesFilters = ({ target }: Configuration, name: string): boolean =>
    targetFilter.test(target) && configurationFilter.test(name);

  const configurations = pickBy(
    matchesFilters,
    config.configurations as Record<string, Configuration>
  );

  if (Object.keys(configurations).length === 0) {
    warn('No matching configurations');
    process.exit(0);
  }

  try {
    await runTests(configurations, options as unknown as Parameters<typeof runTests>[1]);
  } catch (err) {
    if (err instanceof TaskRunnerError) {
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
