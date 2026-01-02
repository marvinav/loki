import fs from 'fs-extra';
import path from 'path';
import ciInfo from 'ci-info';
import * as ramda from 'ramda';
import { createChromeAppTarget } from '../../../target-chrome-app/index.js';

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

const { groupBy, toPairs, fromPairs, mapObjIndexed, map } = ramda;

const getRendererForOptions = (options) => {
  if (options.silent) {
    return renderSilent;
  }

  if (ciInfo.isCI) {
    return renderNonInteractive;
  }
  return renderVerbose;
};

async function placeGitignore(pathsToIgnore) {
  const parentDir = path.dirname(pathsToIgnore[0]);
  const gitignorePath = `${parentDir}/.gitignore`;
  if (!(await fs.pathExists(gitignorePath))) {
    const relativeToParent = (p) => path.relative(parentDir, p);
    const isDecendant = (p) => p.indexOf('..') !== 0;
    const gitignore = pathsToIgnore
      .map(relativeToParent)
      .filter(isDecendant)
      .concat(['']) // For last empty newline
      .join('\n');
    await fs.outputFile(gitignorePath, gitignore);
  }
}

const groupByTarget = (configurations) =>
  mapObjIndexed(
    fromPairs,
    groupBy(([, { target }]) => target, toPairs(configurations))
  );

async function runTests(flatConfigurations, options) {
  if (options.updateReference) {
    await fs.ensureDir(options.referenceDir);
  } else {
    await fs.emptyDirSync(options.outputDir);
    await fs.emptyDirSync(options.differenceDir);
    await placeGitignore([options.outputDir, options.differenceDir]);
  }

  const getTargetTasks = (
    targetName,
    target,
    configurations,
    concurrency = 1,
    tolerance = 0,
    batchSize = 1,
    batchBuilder
  ) => {
    let storybook;

    return {
      id: targetName,
      meta: {
        type: TASK_TYPE_TARGET,
      },
      task: () =>
        new TaskRunner([
          {
            id: `${targetName}/${TASK_TYPE_PREPARE}`,
            meta: {
              target: targetName,
              type: TASK_TYPE_PREPARE,
            },
            task: async () => {
              await target.prepare();
            },
            enabled: !!target.prepare,
          },
          {
            id: `${targetName}/${TASK_TYPE_START}`,
            meta: {
              target: targetName,
              type: TASK_TYPE_START,
            },
            task: async ({ activeTargets }) => {
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
              console.log('fetching stories', target);

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
              new TaskRunner(
                Object.keys(configurations).reduce(
                  (tasks, configurationName) => {
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
                        .map(({ id, kind, story, parameters }) => ({
                          id: `${targetName}/${TASK_TYPE_TEST}/${configurationName}/${kind}/${story}`,
                          meta: {
                            target: targetName,
                            configuration: configurationName,
                            id,
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
                  },
                  []
                ),
                {
                  concurrency: Math.ceil(concurrency / batchSize),
                  exitOnError: false,
                  batchSize,
                  batchBuilder,
                  batchExector: (batch) =>
                    testBatch(
                      target,
                      batch.map(({ task }) => task),
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
            task: async ({ activeTargets }) => {
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

  const createTargetTask = (configurations) => {
    const { target } = configurations[Object.keys(configurations)[0]];
    switch (target) {
      case 'chrome.app': {
        return getTargetTasks(
          target,
          createChromeAppTarget({
            baseUrl: options.reactUri,
            chromeFlags: options.chromeFlags,
          }),
          configurations,
          options.chromeConcurrency,
          options.chromeTolerance
        );
      }
      default: {
        return die(`Unknown target "${target}`);
      }
    }
  };

  const tasks = new TaskRunner(
    Object.values(map(createTargetTask, groupByTarget(flatConfigurations)))
  );

  const context = { activeTargets: [] };
  const render = getRendererForOptions(options);
  const stopRendering = render(tasks);

  try {
    await tasks.run(context);
    stopRendering();
  } catch (err) {
    stopRendering();
    await Promise.all(context.activeTargets.map((target) => target.stop()));
    throw err;
  }
}

export default runTests;
