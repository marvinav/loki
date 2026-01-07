import fsPromises from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import looksSame from 'looks-same';

interface LooksSameConfig {
  tolerance?: number;
  [key: string]: unknown;
}

type ImageDiffer = (
  path1: string,
  path2: string,
  diffPath: string,
  tolerance: number
) => Promise<boolean>;

function ensureFileSync(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createLooksSameDiffer(config: LooksSameConfig = {}): ImageDiffer {
  return async function getImageDiff(
    path1: string,
    path2: string,
    diffPath: string,
    tolerance: number
  ): Promise<boolean> {
    const instanceConfig = { tolerance, ...config };

    const [reference, current] = await Promise.all([
      fsPromises.readFile(path1),
      fsPromises.readFile(path2),
    ]);

    if (current.equals(reference)) {
      return true;
    }

    if (reference.length === 0) {
      throw new Error('Reference image is empty');
    }

    if (current.length === 0) {
      throw new Error('Current image is empty');
    }

    return new Promise((resolve, reject) => {
      // looksSame accepts Buffer as input but types expect string
      looksSame(
        reference as unknown as string,
        current as unknown as string,
        instanceConfig,
        (err, result) => {
          if (err) {
            reject(err);
            return;
          }

          // looks-same callback returns { equal: boolean } but types may vary
          const isSame = (result as unknown as { equal?: boolean })?.equal ?? false;

          if (isSame) {
            resolve(true);
            return;
          }

          ensureFileSync(diffPath);

          looksSame.createDiff(
            {
              ...instanceConfig,
              reference: reference as unknown as string,
              current: current as unknown as string,
              diff: diffPath,
              highlightColor: '#ff00ff',
            },
            (diffErr) => {
              if (diffErr) {
                reject(diffErr);
                return;
              }
              resolve(false);
            }
          );
        }
      );
    });
  };
}

export default createLooksSameDiffer;
export { createLooksSameDiffer };
export type { ImageDiffer, LooksSameConfig };
