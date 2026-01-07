import { hasCommand } from '../core/index.js';

const escapeShell = (str: string): string =>
  `"${str.replace(/(["\t\n\r$`\\])/g, '\\$1')}"`;

type ArgObject = Record<string, string | boolean | number | undefined>;

const isTruthy =
  (args: ArgObject) =>
  (arg: string): boolean =>
    args[arg] !== false && typeof args[arg] !== 'undefined';

const stringifyArg =
  (args: ArgObject) =>
  (arg: string): string => {
    const flag = arg.length === 1 ? `-${arg}` : `--${arg}`;
    if (typeof args[arg] === 'boolean') {
      return flag;
    }
    return `${flag}=${escapeShell(String(args[arg]))}`;
  };

const argObjectToString = (args: ArgObject): string =>
  Object.keys(args).filter(isTruthy(args)).map(stringifyArg(args)).join(' ');

function buildCommand(command: string, argObject: ArgObject): string {
  const args = argObjectToString(argObject);

  if (hasCommand('loki')) {
    return `loki ${command} ${args}`;
  }
  if (hasCommand('yarn')) {
    return `yarn loki ${command} -- ${args}`;
  }
  if (hasCommand('npm')) {
    return `npm run loki ${command} -- ${args}`;
  }
  return `./node_modules/.bin/loki ${command} ${args}`;
}

export default buildCommand;
export type { ArgObject };
