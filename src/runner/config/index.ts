import getDefaults from './get-defaults.js';
import { getProjectPackage } from './project-package.js';

interface Configuration {
  target: string;
  [key: string]: unknown;
}

interface Config {
  configurations: Record<string, Configuration>;
  reactPort?: string;
  [key: string]: unknown;
}

function getConfig(): Config {
  const config = getDefaults() as Config;

  const pkg = getProjectPackage();

  // Merge package.json loki config
  if (pkg.loki) {
    Object.assign(config, pkg.loki);
  }

  // Extract port from storybook script if present
  if (pkg.scripts?.storybook) {
    const matches = pkg.scripts.storybook.match(/(-p|--port) ([0-9]+)/);
    if (matches) {
      config.reactPort = matches[2];
    }
  }

  return config;
}

export default getConfig;
export type { Config, Configuration };
