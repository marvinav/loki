/**
 * File system utilities replacing fs-extra.
 * Uses native Node.js fs/promises API.
 */

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

/**
 * Check if a path exists
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path exists (sync)
 */
function pathExistsSync(filePath: string): boolean {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it recursively if needed
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fsPromises.mkdir(dirPath, { recursive: true });
}

/**
 * Ensure a directory exists (sync)
 */
function ensureDirSync(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Empty a directory by removing all its contents
 */
function emptyDirSync(dirPath: string): void {
  if (!pathExistsSync(dirPath)) {
    ensureDirSync(dirPath);
    return;
  }

  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
}

/**
 * Write file, creating parent directories if needed
 */
async function outputFile(
  filePath: string,
  data: string | Buffer
): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fsPromises.writeFile(filePath, data);
}

/**
 * Write file sync, creating parent directories if needed
 */
function outputFileSync(filePath: string, data: string | Buffer): void {
  const dir = path.dirname(filePath);
  ensureDirSync(dir);
  fs.writeFileSync(filePath, data);
}

/**
 * Read and parse JSON file
 */
async function readJson<T = unknown>(filePath: string): Promise<T> {
  const content = await fsPromises.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Read and parse JSON file (sync)
 */
function readJsonSync<T = unknown>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Write JSON to file, creating parent directories if needed
 */
async function outputJson(
  filePath: string,
  data: unknown,
  options?: { spaces?: number }
): Promise<void> {
  const json = JSON.stringify(data, null, options?.spaces ?? 2);
  await outputFile(filePath, json);
}

/**
 * Write JSON to file sync
 */
function outputJsonSync(
  filePath: string,
  data: unknown,
  options?: { spaces?: number }
): void {
  const json = JSON.stringify(data, null, options?.spaces ?? 2);
  outputFileSync(filePath, json);
}

/**
 * Copy file or directory
 */
function copySync(src: string, dest: string): void {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    ensureDirSync(dest);
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copySync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const destDir = path.dirname(dest);
    ensureDirSync(destDir);
    fs.copyFileSync(src, dest);
  }
}

/**
 * Move file or directory
 */
function moveSync(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  ensureDirSync(destDir);

  try {
    // Try rename first (fast path, same filesystem)
    fs.renameSync(src, dest);
  } catch {
    // Fall back to copy + delete (cross filesystem)
    copySync(src, dest);
    fs.rmSync(src, { recursive: true, force: true });
  }
}

/**
 * Read directory contents
 */
function readdirSync(dirPath: string): string[] {
  return fs.readdirSync(dirPath);
}

/**
 * Read file
 */
function readFileSync(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

export {
  pathExists,
  pathExistsSync,
  ensureDir,
  ensureDirSync,
  emptyDirSync,
  outputFile,
  outputFileSync,
  readJson,
  readJsonSync,
  outputJson,
  outputJsonSync,
  copySync,
  moveSync,
  readdirSync,
  readFileSync,
};
