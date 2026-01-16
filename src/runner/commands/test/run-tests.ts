import path from 'node:path';
import { createChromeAppTarget } from '../../../target-chrome-app/index.js';
import {
  ensureDir,
  emptyDirSync,
  pathExists,
  outputFile,
  groupBy,
  toPairs,
  fromPairs,
  mapObjIndexed,
  map,
} from '../../../core/index.js';

import { die } from '../../console.js';
import testBatch from './test-batch.js';
import { TaskRunner } from './task-runner.js';
import {
  renderVerbose,
  renderNonInteractive,
  renderSilent,
} from './renderers/index.js';
import {
  TASK_TYPE_TARGET,
  TASK_TYPE_PREPARE,
  TASK_TYPE_START,
  TASK_TYPE_FETCH_STORIES,
  TASK_TYPE_TESTS,
  TASK_TYPE_TEST,
  TASK_TYPE_STOP,
} from './constants.js';
import type { CompareScreenshotOptions } from './compare-screenshot.js';
import type { BatchTask, Target } from './test-batch.js';

interface Story {
  id: string;
  kind: string;
  story: string;
  url?: string;
  parameters?: Record<string, unknown>;
}

interface Configuration {
  target: string;
  skipStories?: string;
  storiesFilter?: string;
  [key: string]: unknown;
}

interface TestOptions extends CompareScreenshotOptions {
  chromeConcurrency: number;
  chromeTolerance: number;
  chromeFlags: string[];
  chromeHost?: string;
  chromePort?: number;
  staticServerHost?: string;
  storiesJsonPath?: string;
  passWithNoStories?: boolean;
  skipStoriesPattern?: string;
  storiesFilter?: string;
  verboseRenderer?: boolean;
  silent?: boolean;
}

interface RunContext {
  activeTargets: Target[];
}

type RenderFunction = (tasks: TaskRunner<RunContext>) => () => void;

const getRendererForOptions = (options: TestOptions): RenderFunction => {
  if (options.silent) {
    return renderSilent;
  }
  if (options.verboseRenderer) {
    return renderVerbose;
  }
  return renderNonInteractive;
};

async function placeGitignore(pathsToIgnore: string[]): Promise<void> {
  const parentDir = path.dirname(pathsToIgnore[0]);
  const gitignorePath = `${parentDir}/.gitignore`;

  if (!(await pathExists(gitignorePath))) {
    const relativeToParent = (p: string): string => path.relative(parentDir, p);
    const isDescendant = (p: string): boolean => p.indexOf('..') !== 0;
    const gitignore = pathsToIgnore
      .map(relativeToParent)
      .filter(isDescendant)
      .concat(['']) // For last empty newline
      .join('\n');
    await outputFile(gitignorePath, gitignore);
  }
}

const groupByTarget = (
  configurations: Record<string, Configuration>
): Record<string, Record<string, Configuration>> =>
  mapObjIndexed(
    fromPairs,
    groupBy(([, { target }]) => target, toPairs(configurations))
  );

async function runTests(
  flatConfigurations: Record<string, Configuration>,
  options: TestOptions
): Promise<void> {
  if (options.updateReference) {
    await ensureDir(options.referenceDir);
  } else {
    emptyDirSync(options.outputDir);
    emptyDirSync(options.differenceDir);
    await placeGitignore([options.outputDir, options.differenceDir]);
  }

  const getTargetTasks = (
    targetName: string,
    target: Target & {
      prepare?: () => Promise<void>;
      start: () => Promise<void>;
      stop: () => Promise<void>;
      getStorybook: () => Promise<Story[]>;
    },
    configurations: Record<string, Configuration>,
    concurrency = 1,
    tolerance = 0,
    batchSize = 1,
    batchBuilder?: <T>(array: T[], chunkSize: number) => T[][]
  ) => {
    let storybook: Story[];

    return {
      id: targetName,
      meta: {
        type: TASK_TYPE_TARGET,
      },
      task: () =>
        new TaskRunner<RunContext>([
          {
            id: `${targetName}/${TASK_TYPE_PREPARE}`,
            meta: {
              target: targetName,
              type: TASK_TYPE_PREPARE,
            },
            task: async () => {
              await target.prepare?.();
            },
            enabled: !!target.prepare,
          },
          {
            id: `${targetName}/${TASK_TYPE_START}`,
            meta: {
              target: targetName,
              type: TASK_TYPE_START,
            },
            task: async ({ activeTargets }: RunContext) => {
              await target.start();
              activeTargets.push(target);
            },
          },
          {
            id: `${targetName}/${TASK_TYPE_FETCH_STORIES}`,
            meta: {
              target: targetName,
              type: TASK_TYPE_FETCH_STORIES,
            },
            task: async () => {
              storybook = await target.getStorybook();

              if (storybook.length === 0 && !options.passWithNoStories) {
                throw new Error('Error: No stories were found.');
              }
            },
          },
          {
            id: `${targetName}/${TASK_TYPE_TESTS}`,
            meta: {
              target: targetName,
              type: TASK_TYPE_TESTS,
            },
            task: () =>
              new TaskRunner<RunContext>(
                Object.keys(configurations).reduce<
                  {
                    id: string;
                    meta: {
                      target: string;
                      configuration: string;
                      id: string;
                      url?: string;
                      kind: string;
                      story: string;
                      type: string;
                    };
                    task: BatchTask;
                  }[]
                >((tasks, configurationName) => {
                  const configuration = configurations[configurationName];
                  const excludePattern =
                    options.skipStoriesPattern || configuration.skipStories;
                  const includePattern =
                    options.storiesFilter || configuration.storiesFilter;

                  return tasks.concat(
                    storybook
                      .filter(({ kind, story }) => {
                        const fullStoryName = `${kind} ${story}`;
                        const exclude =
                          excludePattern &&
                          new RegExp(excludePattern, 'i').test(fullStoryName);
                        const include =
                          !includePattern ||
                          new RegExp(includePattern, 'i').test(fullStoryName);
                        return !exclude && include;
                      })
                      .map(({ id, kind, story, parameters, url }) => ({
                        id: `${targetName}/${TASK_TYPE_TEST}/${configurationName}/${kind}/${story}`,
                        meta: {
                          target: targetName,
                          configuration: configurationName,
                          id,
                          url,
                          kind,
                          story,
                          type: TASK_TYPE_TEST,
                        },
                        task: {
                          configuration,
                          configurationName,
                          id,
                          kind,
                          story,
                          parameters,
                        },
                      }))
                  );
                }, []),
                {
                  concurrency: Math.ceil(concurrency / batchSize),
                  exitOnError: false,
                  batchSize,
                  batchBuilder,
                  batchExector: (batch) =>
                    testBatch(
                      target,
                      batch.map(({ task }) => task as BatchTask),
                      options,
                      tolerance
                    ),
                }
              ),
          },
          {
            id: `${targetName}/${TASK_TYPE_STOP}`,
            meta: {
              target: targetName,
              type: TASK_TYPE_STOP,
            },
            task: async ({ activeTargets }: RunContext) => {
              await target.stop();
              const index = activeTargets.indexOf(target);
              if (index !== -1) {
                activeTargets.splice(index, 1);
              }
            },
          },
        ]),
    };
  };

  const createTargetTask = (configurations: Record<string, Configuration>) => {
    const { target } = configurations[Object.keys(configurations)[0]];

    switch (target) {
      case 'chrome.app': {
        return getTargetTasks(
          target,
          createChromeAppTarget({
            chromeFlags: options.chromeFlags,
            chromeHost: options.chromeHost,
            chromePort: options.chromePort,
            staticServerHost: options.staticServerHost,
            storiesPath: options.storiesJsonPath!,
          }),
          configurations,
          options.chromeConcurrency,
          options.chromeTolerance
        );
      }
      default: {
        return die(`Unknown target "${target}"`);
      }
    }
  };

  const tasks = new TaskRunner<RunContext>(
    Object.values(map(createTargetTask, groupByTarget(flatConfigurations)))
  );

  const context: RunContext = { activeTargets: [] };
  const render = getRendererForOptions(options);
  const stopRendering = render(tasks);

  try {
    await tasks.run(context);
    stopRendering();
  } catch (err) {
    stopRendering();
    await Promise.all(context.activeTargets.map((t) => (t as Target & { stop: () => Promise<void> }).stop()));
    throw err;
  }
}

export default runTests;
export type { Story, Configuration, TestOptions, RunContext };
