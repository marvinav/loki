import fs from 'node:fs';
import path from 'node:path';

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  loki?: Record<string, unknown>;
  [key: string]: unknown;
}

function getProjectPackagePath(): string {
  return path.resolve('./package.json');
}

function getProjectPackage(): PackageJson {
  const packagePath = getProjectPackagePath();
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  return JSON.parse(packageContent) as PackageJson;
}

function hasDependency(
  packageName: string,
  pkg: PackageJson = getProjectPackage()
): boolean {
  return Boolean(
    pkg.dependencies?.[packageName] || pkg.peerDependencies?.[packageName]
  );
}

function hasReactNativeDependency(pkg: PackageJson): boolean {
  return hasDependency('react-native', pkg);
}

function isReactNativeProject(): boolean {
  return hasDependency('react-native');
}

export {
  getProjectPackagePath,
  getProjectPackage,
  hasDependency,
  hasReactNativeDependency,
  isReactNativeProject,
};

export type { PackageJson };
