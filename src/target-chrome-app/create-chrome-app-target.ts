/* eslint-disable @typescript-eslint/no-explicit-any */
import createDebug from 'debug';
import chromeLauncher from 'chrome-launcher';
import CDP from 'chrome-remote-interface';
import getRandomPort from './find-free-port-sync.js';
import {
  getAbsoluteURL,
  getLocalIPAddress,
  createStaticServer,
} from '../core/index.js';
import { createChromeTarget, type CDPClient } from '../target-chrome-core/index.js';

const debug = createDebug('loki:chrome:app');

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
}

interface ChromeInstance {
  port: number;
  kill: () => Promise<void> | void;
}

interface CDPTarget {
  id: string;
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
  baseUrl = 'http://localhost:6006',
  useStaticServer = true,
  chromeFlags = ['--disable-gpu', '--hide-scrollbars'],
  cdpOptions = {},
  storiesPath,
}: ChromeAppTargetOptions) {
  let instance: ChromeInstance | undefined;
  let staticServer: StaticServer | undefined;

  const { chromeUrl, isLocalFile, staticServerPath, staticServerPort } =
    getStaticServerConfig(baseUrl);

  async function start(options: Record<string, unknown> = {}): Promise<void> {
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

  async function createNewDebuggerInstance(): Promise<CDPClient> {
    if (!instance) {
      throw new Error('Chrome instance not started');
    }
    const { port } = instance;
    debug(`Launching new tab with debugger at port ${port}`);
    const target = await CDP.New({ port }) as CDPTarget;
    debug(`Launched with target id ${target.id}`);

    const client = await CDP({ port, target, ...cdpOptions });

    client.close = (): Promise<void> => {
      debug('Closing tab');
      return CDP.Close({ port, id: target.id }) as Promise<void>;
    };

    return client;
  }

  return createChromeTarget(
    start,
    stop,
    createNewDebuggerInstance,
    undefined,
    storiesPath
  );
}

export default createChromeAppTarget;
export type { ChromeAppTargetOptions };
