import path from 'node:path';
import minimist from 'minimist';
import { pathExistsSync, outputJsonSync } from '../../../core/index.js';
import { die, info } from '../../console.js';
import getDefaults from '../../config/get-defaults.js';
import {
  getProjectPackagePath,
  getProjectPackage,
} from '../../config/project-package.js';

function init(args: string[]): void {
  const pkg = getProjectPackage();

  const relative = (to: string): string => path.relative('.', to);

  const argv = minimist(args, {
    boolean: ['f', 'force'],
    string: ['c', 'config'],
    default: {},
  });

  const force = argv.force || argv.f;
  const storybookPath = path.resolve(
    argv.config || argv.c || argv._[1] || '.storybook'
  );

  if (!pathExistsSync(storybookPath)) {
    die(
      `Storybook config path not found at "${relative(
        storybookPath
      )}", try passing a --config argument`
    );
  }

  if (pkg.loki && !force) {
    die(
      'Loki already configured, re-run with --force to force reconfiguration'
    );
  }

  info('Adding loki defaults to package.json');
  const modifiedPkg = { ...pkg, loki: getDefaults() };
  outputJsonSync(getProjectPackagePath(), modifiedPkg, { spaces: 2 });
}

export default init;
