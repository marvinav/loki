import fs from 'fs';
import path from 'path';
import { ensureDirSync } from '../core/fs-utils.js';
import createLooksSameDiffer from './create-looks-same-differ.js';

const workingDirectory = `./looks-same-${Math.round(Math.random() * 1000)}`;
const darkGrayPath = path.join(workingDirectory, 'dark-dray.png');
const lightGrayPath = path.join(workingDirectory, 'light-dray.png');

interface WriteBase64ImageOptions {
  outputPath: string;
  base64String: string;
}

function writeBase64Image({ outputPath, base64String }: WriteBase64ImageOptions): void {
  const imageData = base64String.split(';base64,').pop();
  if (!imageData) {
    throw new Error('Invalid base64 string');
  }

  const dir = path.dirname(outputPath);
  ensureDirSync(dir);
  fs.writeFileSync(outputPath, imageData, { encoding: 'base64' });
}

describe('createLooksSameDiffer', () => {
  beforeEach(() => {
    const darkGrayBase64String =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2NISUn5DwAEiAIshLJN6AAAAABJRU5ErkJggg==';
    writeBase64Image({
      outputPath: darkGrayPath,
      base64String: darkGrayBase64String,
    });
    const lightGrayBase64String =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2M4ceLEfwAIDANYMDoQswAAAABJRU5ErkJggg==';
    writeBase64Image({
      outputPath: lightGrayPath,
      base64String: lightGrayBase64String,
    });
  });

  afterEach(() => {
    fs.rmSync(workingDirectory, { recursive: true });
  });

  it('creates diff files in deeply nested directories', async () => {
    const config = {};
    const looksSameDiffer = createLooksSameDiffer(config);

    const diffPath = path.join(
      workingDirectory,
      'deeply',
      'nested',
      'diff.png'
    );
    const tolerance = 0;
    await looksSameDiffer(darkGrayPath, lightGrayPath, diffPath, tolerance);

    expect(fs.existsSync(diffPath)).toEqual(true);
  });
});
