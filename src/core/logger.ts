/**
 * Simple debug logger with namespace support.
 * Replaces the 'debug' npm package.
 *
 * Usage:
 *   const debug = createLogger('loki:chrome');
 *   debug('Starting chrome...');
 *
 * Enable via DEBUG environment variable:
 *   DEBUG=loki:* node script.js
 *   DEBUG=loki:chrome node script.js
 */

interface Logger {
  (...args: unknown[]): void;
  enabled: boolean;
}

function isDebugEnabled(namespace: string): boolean {
  const debugEnv = process.env['DEBUG'] || '';
  if (!debugEnv) return false;

  const patterns = debugEnv.split(',').map((p) => p.trim());

  for (const pattern of patterns) {
    if (pattern === '') continue;

    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(namespace)) {
      return true;
    }
  }

  return false;
}

function createLogger(namespace: string): Logger {
  const enabled = isDebugEnabled(namespace);

  const logger: Logger = (...args: unknown[]) => {
    if (!enabled) return;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${namespace}:`, ...args);
  };

  logger.enabled = enabled;

  return logger;
}

export { createLogger, type Logger };
