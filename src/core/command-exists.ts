/**
 * Check if a command exists in the system PATH.
 * Replaces shelljs.which() functionality.
 */

import { execSync } from 'node:child_process';

/**
 * Check if a command exists in the system PATH
 *
 * @param command - The command name to check
 * @returns The path to the command if found, null otherwise
 */
function commandExists(command: string): string | null {
  try {
    const isWindows = process.platform === 'win32';
    const checkCommand = isWindows ? 'where' : 'which';

    const result = execSync(`${checkCommand} ${command}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Return first line (in case of multiple matches)
    const firstLine = result.trim().split('\n')[0];
    return firstLine || null;
  } catch {
    return null;
  }
}

/**
 * Check if a command exists (boolean version)
 */
function hasCommand(command: string): boolean {
  return commandExists(command) !== null;
}

export { commandExists, hasCommand };
