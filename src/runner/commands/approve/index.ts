import path from 'node:path';
import {
  readdirSync,
  copySync,
  moveSync,
  emptyDirSync,
  ensureDirSync,
} from '../../../core/index.js';
import { die } from '../../console.js';
import parseOptions from './parse-options.js';
import getConfig from '../../config/index.js';

const isPNG = (file: string): boolean => file.endsWith('.png');

function approve(args: string[]): void {
  const config = getConfig();
  const { outputDir, differenceDir, referenceDir, diffOnly } = parseOptions(
    args,
    config
  );

  // If diff only is active, only copy over the files that were changed
  const inputDir = diffOnly ? differenceDir : outputDir;
  const files = readdirSync(inputDir).filter(isPNG);

  if (!files.length) {
    die(
      'No images found to approve',
      'Run update command to generate reference files instead'
    );
  }

  if (diffOnly) {
    /**
     * If diff only is active, the reference directory should not be emptied.
     * Instead only the files that changed will be copied over, overwriting the existing ones.
     * The files are copied and not moved, so running loki approve without --diffOnly after running it with --diffOnly
     * would not delete them as they would no longer be present in the current images.
     */
    files.forEach((file) =>
      copySync(path.join(outputDir, file), path.join(referenceDir, file))
    );
    return;
  }

  emptyDirSync(referenceDir);
  ensureDirSync(referenceDir);

  files.forEach((file) =>
    moveSync(path.join(outputDir, file), path.join(referenceDir, file))
  );
}

export default approve;
