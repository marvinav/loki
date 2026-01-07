/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  disableAnimations,
  disableInputCaret,
  disablePointerEvents,
  getSelectorBoxSize,
  awaitLokiReady,
  awaitSelectorPresent,
  setLokiIsRunning,
  setLokiTestAttribute,
  populateLokiHelpers,
} from '../browser/index.js';
import { createReadyStateManager } from '../integration-core/index.js';

import {
  TimeoutError,
  withTimeout,
  withRetries,
  createLogger,
  readJson,
  isStoryLocal,
  isStoryNetwork,
} from '../core/index.js';
import type { Story, StoryLocal, StoryNetwork } from '../core/index.js';
import presets from './presets.json' with { type: 'json' };
import type CDP from 'chrome-remote-interface';

const debug = createLogger('loki:chrome');

const CAPTURING_SCREENSHOT_TIMEOUT = 30000;
const CAPTURING_SCREENSHOT_RETRY_BACKOFF = 500;
const RESIZE_DELAY = 500;

const delay = (duration: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, duration));

interface MediaFeature {
  name: string;
  value: string;
}

interface DeviceMetrics {
  width: number;
  height: number;
  deviceScaleFactor: number;
  mobile: boolean;
}

interface TabOptions {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  mobile?: boolean;
  userAgent?: string;
  clearBrowserCookies?: boolean;
  media?: string;
  features?: MediaFeature[];
  fetchFailIgnore?: string;
  chromeEnableAnimations?: boolean;
  chromeRetries?: number;
  chromeLoadTimeout?: number;
  chromeSelector?: string;
  disableAutomaticViewportHeight?: boolean;
  preset?: string;
}

interface StoryParameters {
  loki?: {
    chromeSelector?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface Configuration {
  preset?: string;
  chromeSelector?: string;
  [key: string]: unknown;
}

interface Options {
  chromeEmulatedMedia?: string;
  fetchFailIgnore?: string;
  chromeSelector?: string;
  chromeLoadTimeout?: number;
  chromeRetries?: number;
  [key: string]: unknown;
}

interface Preset {
  userAgent?: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  mobile?: boolean;
  media?: string;
  features?: MediaFeature[];
}


interface Clip {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
}


interface BoxSize {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RequestsFinishedAwaiter {
  resolve: () => void;
  reject: (error: Error) => void;
}

type StartFunction = (options?: Record<string, unknown>) => Promise<void>;
type StopFunction = () => Promise<void>;
type CreateDebuggerFunction = () => Promise<CDP.Client>;
type PrepareFunction = (() => Promise<void>) | undefined;

function createChromeTarget(
  start: StartFunction,
  stop: StopFunction,
  createNewDebuggerInstance: CreateDebuggerFunction,
  prepare: PrepareFunction,
  storiesPath: string
) {
  function getDeviceMetrics(options: TabOptions): DeviceMetrics {
    return {
      width: options.width,
      height: options.height,
      deviceScaleFactor: options.deviceScaleFactor ?? 1,
      mobile: options.mobile ?? false,
    };
  }

  async function launchNewTab(options: TabOptions) {
    const fetchFailIgnore =
      options.fetchFailIgnore ? new RegExp(options.fetchFailIgnore, 'i') : null;
    const client = await createNewDebuggerInstance();
    const deviceMetrics = getDeviceMetrics(options);
    const { Runtime, Page, Emulation, DOM, Network } = client;

    await Runtime.enable();
    await Network.enable({});
    await DOM.enable({});
    await Page.enable();
    if (options.userAgent) {
      await Network.setUserAgentOverride({
        userAgent: options.userAgent,
      });
    }
    if (options.clearBrowserCookies) {
      await Network.clearBrowserCookies();
    }
    await Emulation.setDeviceMetricsOverride(deviceMetrics);

    if (options.media || options.features) {
      const emulated: { media?: string; features?: MediaFeature[] } = {};

      if (options.media) {
        emulated.media = options.media;
      }

      if (options.features) {
        emulated.features = options.features;
      }

      await Emulation.setEmulatedMedia(emulated);
    }

    const pendingRequestURLMap: Record<string, string> = {};
    const failedURLs: string[] = [];
    let stabilizationTimer: ReturnType<typeof setTimeout> | null = null;
    let requestsFinishedAwaiter: RequestsFinishedAwaiter | null = null;

    const maybeFulfillPromise = (): void => {
      if (!requestsFinishedAwaiter) {
        return;
      }
    };

    const startObservingRequests = (): void => {
      const requestEnded = (requestId: string): void => {
        delete pendingRequestURLMap[requestId];
        maybeFulfillPromise();
      };

      const requestFailed = (requestId: string): void => {
        const failedURL = pendingRequestURLMap[requestId];
        if (failedURL && (!fetchFailIgnore || !fetchFailIgnore.test(failedURL))) {
          failedURLs.push(failedURL);
        }
        requestEnded(requestId);
      };

      Network.requestWillBeSent(({ requestId, request }) => {
        if (stabilizationTimer) {
          clearTimeout(stabilizationTimer);
        }
        pendingRequestURLMap[requestId] = request.url;
      });

      Network.responseReceived(({ requestId, response }) => {
        if (response.status >= 400) {
          requestFailed(requestId);
        } else {
          requestEnded(requestId);
        }
      });

      Network.loadingFailed(({ requestId }) => {
        requestFailed(requestId);
      });
    };

    const evaluateOnNewDocument = (scriptSource: string) => {
      if (Page.addScriptToEvaluateOnLoad) {
        return Page.addScriptToEvaluateOnLoad({ scriptSource });
      }
      return Page.addScriptToEvaluateOnNewDocument({ source: scriptSource });
    };

    const executeFunctionWithWindow = async (
      functionToExecute: any,
      ...args: any[]
    ): Promise<any> => {
      const stringifiedArgs = ['window']
        .concat(args.map((arg) => JSON.stringify(arg)))
        .join(',');
      const expression = `(() => Promise.resolve((${functionToExecute})(${stringifiedArgs})).then(JSON.stringify))()`;
      const { result } = await Runtime.evaluate({
        expression,
        awaitPromise: true,
      });
      if (result.subtype === 'error') {
        throw new Error(
          (result.description ?? '').replace(/^Error: /, '').split('\n')[0]
        );
      }
      return result.value ? JSON.parse(result.value) : undefined;
    };

    const ensureNoErrorPresent = async (): Promise<void> => {
      const errorMessage = await executeFunctionWithWindow(() => {
        return null;
      });
      if (errorMessage) {
        throw new Error(`Failed to render with error "${errorMessage}"`);
      }
    };

    const loadUrl = async (url: string, selectorToBePresent?: string): Promise<void> => {
      await evaluateOnNewDocument(
        `(${populateLokiHelpers})(window, (${createReadyStateManager})());`
      );
      if (!options.chromeEnableAnimations) {
        debug('Disabling animations');
        await evaluateOnNewDocument(`(${disableAnimations})(window);`);
      }
      await evaluateOnNewDocument(`(${disablePointerEvents})(window);`);
      await evaluateOnNewDocument(`(${disableInputCaret})(window);`);
      await evaluateOnNewDocument(`(${setLokiIsRunning})(window);`);

      debug(`Navigating to ${url}`);
      startObservingRequests();
      await Page.navigate({ url });
      await Page.loadEventFired();

      if (selectorToBePresent) {
        debug(`Awaiting selector "${selectorToBePresent}"`);
        try {
          await executeFunctionWithWindow(
            awaitSelectorPresent,
            selectorToBePresent
          );
          debug(`Selector "${selectorToBePresent}" found!`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          debug(`Error waiting for selector "${errorMessage}"!`);
          if (errorMessage.startsWith('Timeout')) {
            await ensureNoErrorPresent();
          }
          throw error;
        }
      }

      debug('Waiting for awaitRequestsFinished...');
      // await awaitRequestsFinished();

      debug('Awaiting runtime setup');
      await executeFunctionWithWindow(setLokiTestAttribute);

      debug('Waiting for executeFunctionWithWindow...');
      await executeFunctionWithWindow(awaitLokiReady);
    };

    const getPositionInViewport = async (selector: string): Promise<BoxSize> => {
      try {
        const result = await executeFunctionWithWindow(getSelectorBoxSize, selector);
        return result as BoxSize;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage === 'No visible elements found') {
          throw new Error(
            `Unable to get position of selector "${selector}". Review the \`chromeSelector\` option and make sure your story doesn't crash.`
          );
        }
        throw error;
      }
    };

    const captureScreenshotInner = async (selector = 'body'): Promise<Buffer> => {
        debug(`Getting viewport position of "${selector}"`);
        const position = await getPositionInViewport(selector);

        if (position.width === 0 || position.height === 0) {
          throw new Error(
            `Selector "${selector}" has zero width or height. Can't capture screenshot.`
          );
        }

        const clip: Clip = {
          scale: 1,
          x: Math.floor(position.x),
          y: Math.floor(position.y),
          width: Math.ceil(position.width),
          height: Math.ceil(position.height),
        };

        if (clip.x < 0) {
          clip.width += clip.x;
          clip.x = 0;
        }

        if (clip.y < 0) {
          clip.height += clip.y;
          clip.y = 0;
        }

        if (clip.x + clip.width > deviceMetrics.width) {
          clip.width = deviceMetrics.width - clip.x;
        }

        if (
          options.disableAutomaticViewportHeight &&
          clip.y + clip.height > deviceMetrics.height
        ) {
          clip.height = deviceMetrics.height - clip.y;
        }

        const contentEndY = clip.y + clip.height;
        const shouldResizeWindowToFit =
          !options.disableAutomaticViewportHeight &&
          contentEndY > deviceMetrics.height;

        if (shouldResizeWindowToFit) {
          const override: DeviceMetrics = {
            ...deviceMetrics,
            height: contentEndY,
          };
          debug('Resizing window to fit tall content');
          await Emulation.setDeviceMetricsOverride(override);
          await delay(RESIZE_DELAY);
        }

        debug('Capturing screenshot');
        const screenshot = await Page.captureScreenshot({
          format: 'png',
          clip,
        });
        const buffer = Buffer.from(screenshot.data, 'base64');

        if (shouldResizeWindowToFit) {
          await Emulation.setDeviceMetricsOverride(deviceMetrics);
        }

        return buffer;
    };

    const captureScreenshotWithTimeout = withTimeout(
      CAPTURING_SCREENSHOT_TIMEOUT,
      'captureScreenshot'
    )(captureScreenshotInner) as (selector?: string) => Promise<Buffer>;

    const captureScreenshot = withRetries<[string?], Buffer>(
      options.chromeRetries ?? 0,
      CAPTURING_SCREENSHOT_RETRY_BACKOFF
    )(captureScreenshotWithTimeout);

    return {...client, captureScreenshot, loadUrl, executeFunctionWithWindow};
  }

  const getStoryUrl = async (storyId: string): Promise<string | undefined> => {
    const stories = await readJson<Story[]>(storiesPath);
    const story = stories.find((x) => x.id === storyId);

    if (!story) {
      return undefined;
    }

    if (isStoryLocal(story)) {
      // Construct file:// URL from baseDir and staticPath
      return `file://${story.baseDir}${story.staticPath}`;
    }

    if (isStoryNetwork(story)) {
      return story.url;
    }

    return undefined;
  };

  const getStorybook = async (): Promise<Story[]> => {
    try {
      const stories = await readJson<Story[]>(storiesPath);

      if (!Array.isArray(stories)) {
        throw new Error('Stories file must contain an array of stories');
      }

      return stories;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to read stories from ${storiesPath}: ${errorMessage}`
      );
    }
  };

  async function captureScreenshotForStory(
    storyId: string,
    options: Options,
    configuration: Configuration,
    parameters?: StoryParameters
  ): Promise<Buffer | undefined> {
    let tabOptions: TabOptions = {
      media: options.chromeEmulatedMedia,
      fetchFailIgnore: options.fetchFailIgnore,
      ...configuration,
      ...(parameters?.loki ?? {}),
    } as TabOptions;

    if (configuration.preset) {
      const preset = (presets as Record<string, Preset>)[configuration.preset];
      if (!preset) {
        throw new Error(`Invalid preset ${configuration.preset}`);
      }
      tabOptions = { ...tabOptions, ...preset };
    }

    const selector =
      parameters?.loki?.chromeSelector ??
      configuration.chromeSelector ??
      options.chromeSelector;

    const url = await getStoryUrl(storyId);
    const tab = await launchNewTab(tabOptions);
    let screenshot: Buffer | undefined;

    try {
      await withTimeout(options.chromeLoadTimeout ?? 60000)(tab.loadUrl!(url!, selector));
      screenshot = await tab.captureScreenshot!(selector) as Buffer;
    } catch (err) {
      if (err instanceof TimeoutError) {
        debug(`Timed out waiting for "${url}" to load`);
      } else {
        throw err;
      }
    } finally {
      await tab.close();
    }

    return screenshot;
  }

  return {
    start,
    stop,
    prepare,
    getStorybook,
    captureScreenshotForStory,
  };
}

export { createChromeTarget };
export type {
  TabOptions,
  Story,
  Configuration,
  Options,
  StartFunction,
  StopFunction,
  CreateDebuggerFunction,
  PrepareFunction,
};
