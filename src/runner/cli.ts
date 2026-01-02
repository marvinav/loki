import minimist from './minimist.js';
import {
  MissingDependencyError,
  ServerError,
  ChromeError,
  FetchingURLsError,
  unwrapError,
} from './core/index.js';
import { die, bold } from './console.js';

import init from './commands/init/index.js';
import test from './commands/test/index.js';
import approve from './commands/approve/index.js';

const getExecutorForCommand = (command: 'init' | 'update' | 'test' | 'approve' | string | number) => {
  switch (command) {
    case 'init': {
      return init;
    }
    case 'update':
    case 'test': {
      return test;
    }
    case 'approve': {
      return approve;
    }
    default: {
      return die(`Invalid command ${command}`);
    }
  }
};

export default async function run() {
  const args = process.argv.slice(2);
  const argv = minimist<{ silent: boolean }>(args);
  const command = argv._[0] || 'test';
  const executor = getExecutorForCommand(command);

  if (!argv.silent) {
    bold(`loki ${command}`);
  }

  try {
    await executor(args);
  } catch (rawError) {
    const error = unwrapError(rawError);

    if (
      error instanceof MissingDependencyError ||
      error instanceof ServerError ||
      error instanceof ChromeError ||
      error instanceof FetchingURLsError
    ) {
      die(error.message, error.instructions);
    }

    const childProcessFailed =
      error.cmd &&
      error.stderr &&
      error.message.indexOf('Command failed: ') === 0;
    if (childProcessFailed) {
      die(error.stderr);
    }
    die(error);
  }
}
