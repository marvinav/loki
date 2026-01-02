/* eslint-disable global-require, import/no-dynamic-require */
import fs from 'fs';
import path from 'path';

function getProjectPackagePath() {
  return path.resolve('./package.json');
}

function getProjectPackage() {
  const packagePath = getProjectPackagePath();
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  return JSON.parse(packageContent);
}

function hasDependency(packageName, pkg = getProjectPackage()) {
  return Boolean(
    (pkg.dependencies && pkg.dependencies[packageName]) ||
    (pkg.peerDependencies && pkg.peerDependencies[packageName])
  );
}

function hasReactNativeDependency(pkg) {
  return hasDependency('react-native', pkg);
}

function isReactNativeProject() {
  return hasDependency('react-native');
}

export {
  getProjectPackagePath,
  getProjectPackage,
  hasReactNativeDependency,
  isReactNativeProject,
};
