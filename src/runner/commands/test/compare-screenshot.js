import fs from 'fs-extra';
import path from 'path';
import { ReferenceImageError } from '../../../core/index.js';
import { getImageDiffer } from './get-image-differ.js';
import { getOutputPaths } from './get-output-paths.js';

async function compareScreenshot(
  screenshot,
  options,
  tolerance,
  configurationName,
  kind,
  story,
  parameters
) {
  const { outputPath, referencePath, diffPath } = getOutputPaths(
    options,
    configurationName,
    kind,
    story,
    parameters
  );
  const referenceExists = await fs.pathExists(referencePath);
  const shouldUpdateReference =
    options.updateReference || (!options.requireReference && !referenceExists);

  await fs.outputFile(
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
    options[options.diffingEngine]
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
