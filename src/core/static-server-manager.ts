import http from 'node:http';
import { createStaticServer } from './create-static-server.js';
import { createLogger } from './logger.js';

const debug = createLogger('loki:static-server');

interface ServerInfo {
  server: http.Server;
  port: number;
  baseUrl: string;
}

/**
 * Manages static file servers for local story directories.
 * Reuses servers for the same baseDir to avoid creating multiple servers.
 */
class StaticServerManager {
  private servers: Map<string, ServerInfo> = new Map();
  private nextPort = 9500;
  private host: string;

  constructor(host = 'localhost') {
    this.host = host;
  }

  /**
   * Get or create a static server for the given directory.
   * Returns the base URL for accessing files from this directory.
   */
  async getServerUrl(baseDir: string): Promise<string> {
    const existing = this.servers.get(baseDir);
    if (existing) {
      debug(`Reusing static server for ${baseDir} at ${existing.baseUrl}`);
      return existing.baseUrl;
    }

    const server = createStaticServer(baseDir);
    const port = await this.startServer(server);
    const baseUrl = `http://${this.host}:${port}`;

    this.servers.set(baseDir, { server, port, baseUrl });
    debug(`Created static server for ${baseDir} at ${baseUrl}`);

    return baseUrl;
  }

  /**
   * Start a server and find an available port.
   * Binds to 0.0.0.0 to allow external access (e.g., from Docker containers).
   */
  private startServer(server: http.Server): Promise<number> {
    return new Promise((resolve, reject) => {
      const tryPort = (port: number) => {
        server.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            tryPort(port + 1);
          } else {
            reject(err);
          }
        });

        // Bind to 0.0.0.0 to allow connections from Docker containers
        server.listen(port, '0.0.0.0', () => {
          this.nextPort = port + 1;
          resolve(port);
        });
      };

      tryPort(this.nextPort);
    });
  }

  /**
   * Stop all running servers.
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.servers.entries()).map(
      ([baseDir, { server }]) =>
        new Promise<void>((resolve) => {
          server.close(() => {
            debug(`Stopped static server for ${baseDir}`);
            resolve();
          });
        })
    );

    await Promise.all(stopPromises);
    this.servers.clear();
  }

  /**
   * Check if a server exists for the given directory.
   */
  hasServer(baseDir: string): boolean {
    return this.servers.has(baseDir);
  }

  /**
   * Get the number of active servers.
   */
  get serverCount(): number {
    return this.servers.size;
  }
}

/**
 * Create a new static server manager instance.
 * @param host - The hostname to use in URLs (default: 'localhost').
 *               Use 'host.docker.internal' or your machine's IP for Docker access.
 */
function createStaticServerManager(host = 'localhost'): StaticServerManager {
  return new StaticServerManager(host);
}

export { StaticServerManager, createStaticServerManager };
