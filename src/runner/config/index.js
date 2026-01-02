import getDefaults from './get-defaults.js';
import {
  getProjectPackage,
  isReactNativeProject,
} from './project-package.js';

function getConfig() {

  const config = getDefaults();

  const pkg = getProjectPackage();
  if (pkg.scripts && pkg.scripts.storybook) {
    const matches = pkg.scripts.storybook.match(/(-p|--port) ([0-9]+)/);
    if (matches) {
      const portKey = isReactNativeProject() ? 'reactNativePort' : 'reactPort';
      // eslint-disable-next-line prefer-destructuring
      config[portKey] = matches[2];
    }
  }
  return config;
}

export default getConfig;
