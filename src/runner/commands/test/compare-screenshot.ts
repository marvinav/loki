import path from 'node:path';
import { ReferenceImageError, pathExists, outputFile } from '../../../core/index.js';
import { getImageDiffer } from './get-image-differ.js';
import { getOutputPaths } from './get-output-paths.js';
import type { FileNameFormatter } from './get-output-paths.js';

interface CompareScreenshotOptions {
  outputDir: string;
  referenceDir: string;
  differenceDir: string;
  fileNameFormatter?: FileNameFormatter;
  updateReference?: boolean;
  requireReference?: boolean;
  diffingEngine: string;
  [key: string]: unknown;
}

async function compareScreenshot(
  screenshot: Buffer | undefined,
  options: CompareScreenshotOptions,
  tolerance: number,
  configurationName: string,
  kind: string,
  story: string,
  parameters?: Record<string, unknown>
): Promise<void> {
  if (!screenshot) {
    throw new ReferenceImageError('Screenshot capture failed', kind, story);
  }

  const { outputPath, referencePath, diffPath } = getOutputPaths(
    options,
    configurationName,
    kind,
    story,
    parameters
  );

  const referenceExists = await pathExists(referencePath);
  const shouldUpdateReference =
    options.updateReference || (!options.requireReference && !referenceExists);

  await outputFile(
    shouldUpdateReference ? referencePath : outputPath,
    screenshot
  );

  if (shouldUpdateReference) {
    return;
  }

  if (!referenceExists) {
    throw new ReferenceImageError('No reference image found', kind, story);
  }

  const isEqual = await getImageDiffer(
    options.diffingEngine,
    (options[options.diffingEngine] as Record<string, unknown>) ?? {}
  )(referencePath, outputPath, diffPath, tolerance);

  if (!isEqual) {
    throw new ReferenceImageError(
      `Screenshot differs from reference, see ${path.relative(
        path.resolve('./'),
        diffPath
      )}`,
      kind,
      story
    );
  }
}

export default compareScreenshot;
export type { CompareScreenshotOptions };
