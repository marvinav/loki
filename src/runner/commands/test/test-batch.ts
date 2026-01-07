import compareScreenshot from './compare-screenshot.js';
import type { CompareScreenshotOptions } from './compare-screenshot.js';

interface BatchTask {
  configuration: Record<string, unknown>;
  configurationName: string;
  id: string;
  kind: string;
  story: string;
  parameters?: Record<string, unknown>;
}

interface Target {
  captureScreenshotForStory: (
    id: string,
    options: CompareScreenshotOptions,
    configuration: Record<string, unknown>,
    parameters?: Record<string, unknown>
  ) => Promise<Buffer | undefined>;
  captureScreenshotsForStories?: (
    batch: BatchTask[],
    options: CompareScreenshotOptions
  ) => Promise<(Buffer | Error)[]>;
}

function testBatch(
  target: Target,
  batch: BatchTask[],
  options: CompareScreenshotOptions,
  tolerance: number
): Promise<void>[] {
  // Batch capture mode (for targets that support it)
  if (target.captureScreenshotsForStories) {
    type Resolver = [(value: void | PromiseLike<void>) => void, (reason: Error) => void];
    const resolvers: Resolver[] = new Array(batch.length);

    const promises = batch.map<Promise<void>>(
      (_, i) =>
        new Promise((resolve, reject) => {
          resolvers[i] = [resolve, reject];
        })
    );

    target
      .captureScreenshotsForStories(batch, options)
      .then((screenshots) =>
        screenshots.forEach((screenshot, i) => {
          const [resolve, reject] = resolvers[i];
          if (screenshot instanceof Error) {
            reject(screenshot);
          } else {
            const task = batch[i];
            resolve(
              compareScreenshot(
                screenshot,
                options,
                tolerance,
                task.configurationName,
                task.kind,
                task.story,
                task.parameters
              )
            );
          }
        })
      )
      .catch((error: Error) =>
        resolvers.forEach(([, reject]) => reject(error))
      );

    return promises;
  }

  // Individual capture mode
  return batch.map(
    async ({
      configuration,
      configurationName,
      id,
      kind,
      story,
      parameters,
    }) => {
      const screenshot = await target.captureScreenshotForStory(
        id,
        options,
        configuration,
        parameters
      );
      return compareScreenshot(
        screenshot,
        options,
        tolerance,
        configurationName,
        kind,
        story,
        parameters
      );
    }
  );
}

export default testBatch;
export type { BatchTask, Target };
