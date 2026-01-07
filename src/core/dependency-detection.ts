import { commandExists } from './command-exists.js';
import { MissingDependencyError } from './errors.js';

interface DependencyInfo {
  name: string;
  instructions: string;
}

const DEPENDENCIES: Record<string, DependencyInfo> = {
  gm: {
    name: 'GraphicsMagick',
    instructions: 'You can install it with: brew install graphicsmagick',
  },
};

/**
 * Check if a system dependency is available
 */
function dependencyAvailable(dependency: string): boolean {
  return commandExists(dependency) !== null;
}

/**
 * Ensure a dependency is available, throw if not
 */
function ensureDependencyAvailable(dependency: string): void {
  if (!dependencyAvailable(dependency)) {
    const dependencyInfo = DEPENDENCIES[dependency];

    if (!dependencyInfo) {
      throw new MissingDependencyError(dependency);
    }

    throw new MissingDependencyError(
      dependencyInfo.name,
      dependencyInfo.instructions
    );
  }
}

export { dependencyAvailable, ensureDependencyAvailable };
