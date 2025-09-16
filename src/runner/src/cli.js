/* eslint-disable global-require */

const minimist = require('./minimist');
console.log(minimist)
const {
  MissingDependencyError,
  ServerError,
  ChromeError,
  FetchingURLsError,
  unwrapError,
} = require('./core');
const { die, bold } = require('./console');

const getExecutorForCommand = (command) => {
  switch (command) {
    case 'init': {
      return require('./commands/init');
    }
    case 'update':
    case 'test': {
      return require('./commands/test');
    }
    case 'approve': {
      return require('./commands/approve');
    }
    default: {
      return die(`Invalid command ${command}`);
    }
  }
};

async function run() {
  const args = process.argv.slice(2);
  const argv = minimist(args);
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

module.exports = run;
