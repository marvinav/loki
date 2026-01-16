/* eslint-disable @typescript-eslint/no-explicit-any */
import chromeLauncher from 'chrome-launcher';
import CDP from 'chrome-remote-interface';
import getRandomPort from './find-free-port-sync.js';
import {
  getAbsoluteURL,
  getLocalIPAddress,
  createStaticServer,
  createLogger,
} from '../core/index.js';
import { createChromeTarget } from '../target-chrome-core/index.js';

const debug = createLogger('loki:chrome:app');

interface StaticServerConfig {
  chromeUrl: string;
  isLocalFile: boolean;
  staticServerPath: string | undefined;
  staticServerPort: number | undefined;
}

interface ChromeAppTargetOptions {
  baseUrl?: string;
  useStaticServer?: boolean;
  chromeFlags?: string[];
  cdpOptions?: Record<string, unknown>;
  storiesPath: string;
  chromeHost?: string;
  chromePort?: number;
  staticServerHost?: string;
}

interface ChromeInstance {
  port: number;
  kill: () => Promise<void> | void;
}

interface StaticServer {
  listen: (port: number) => void;
  close: () => void;
}

function getStaticServerConfig(baseUrl: string): StaticServerConfig {
  let staticServerPath: string | undefined;
  let staticServerPort: number | undefined;

  let chromeUrl = getAbsoluteURL(baseUrl);
  const isLocalFile = chromeUrl.indexOf('file:') === 0;

  if (chromeUrl.indexOf('http://localhost') === 0 || isLocalFile) {
    const ip = getLocalIPAddress();

    if (!ip) {
      throw new Error(
        'Unable to detect local IP address, try passing --host argument'
      );
    }

    if (isLocalFile) {
      staticServerPort = getRandomPort() as number;
      staticServerPath = chromeUrl.substr('file:'.length);
      chromeUrl = `http://${ip}:${staticServerPort}`;
    } else {
      chromeUrl = chromeUrl.replace('localhost', ip);
    }
  }

  return {
    chromeUrl,
    isLocalFile,
    staticServerPath,
    staticServerPort,
  };
}

function createChromeAppTarget({
  baseUrl = 'file:./test/iframe.html',
  useStaticServer = true,
  chromeFlags = ['--disable-gpu', '--hide-scrollbars'],
  cdpOptions = {},
  storiesPath,
  chromeHost,
  chromePort,
  staticServerHost = 'localhost',
}: ChromeAppTargetOptions) {
  const isRemote = chromeHost !== undefined && chromePort !== undefined;

  let instance: ChromeInstance | undefined;
  let staticServer: StaticServer | undefined;

  // For remote Chrome, we don't need static server config
  const { chromeUrl, isLocalFile, staticServerPath, staticServerPort } = isRemote
    ? { chromeUrl: '', isLocalFile: false, staticServerPath: undefined, staticServerPort: undefined }
    : getStaticServerConfig(baseUrl);

  async function start(options: Record<string, unknown> = {}): Promise<void> {
    if (isRemote) {
      debug(`Connecting to remote Chrome at ${chromeHost}:${chromePort}`);
      // For remote Chrome, we just verify the connection works
      try {
        await CDP.Version({ host: chromeHost, port: chromePort });
        debug('Successfully connected to remote Chrome');
      } catch (err) {
        throw new Error(`Failed to connect to remote Chrome at ${chromeHost}:${chromePort}: ${err}`);
      }
      return;
    }

    if (useStaticServer && isLocalFile && staticServerPath && staticServerPort) {
      staticServer = createStaticServer(staticServerPath) as StaticServer;
      staticServer.listen(staticServerPort);
      debug(`Starting static file server at ${chromeUrl}`);
    }
    const launchOptions = {
      chromeFlags,
      logLevel: debug.enabled ? 'verbose' : 'silent',
      ...options,
    } as const;
    debug(
      `Launching chrome with flags "${launchOptions.chromeFlags.join(' ')}"`
    );
    instance = await chromeLauncher.launch(launchOptions as any);
  }

  async function stop(): Promise<void> {
    if (isRemote) {
      debug('Remote Chrome - nothing to stop');
      return;
    }

    if (instance) {
      debug('Killing chrome');
      await instance.kill();
    } else {
      debug('No chrome instance to kill');
    }

    if (useStaticServer && staticServer) {
      staticServer.close();
    }
  }

  async function createNewDebuggerInstance(): Promise<CDP.Client> {
    const port = isRemote ? chromePort! : instance?.port;
    const host = isRemote ? chromeHost : 'localhost';

    if (!port) {
      throw new Error('Chrome instance not started');
    }

    debug(`Launching new tab with debugger at ${host}:${port}`);
    const target = await CDP.New({ host, port });
    debug(`Launched with target id ${target.id}`);

    const client = await CDP({ host, port, target, ...cdpOptions });

    client.close = (): Promise<void> => {
      debug('Closing tab');
      return CDP.Close({ host, port, id: target.id }) as Promise<void>;
    };

    return client;
  }

  return createChromeTarget(
    start,
    stop,
    createNewDebuggerInstance,
    undefined,
    storiesPath,
    staticServerHost
  );
}

export default createChromeAppTarget;
export type { ChromeAppTargetOptions };
