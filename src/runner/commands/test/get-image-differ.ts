import { createLooksSameDiffer } from '../../../diff-looks-same/index.js';

type ImageDiffer = (
  referencePath: string,
  outputPath: string,
  diffPath: string,
  tolerance: number
) => Promise<boolean>;

function getImageDiffer(
  engine: string,
  config: Record<string, unknown>
): ImageDiffer {
  switch (engine) {
    case 'looks-same': {
      return createLooksSameDiffer(config);
    }
    default: {
      throw new Error(`Unsupported engine "${engine}"`);
    }
  }
}

export { getImageDiffer };
export type { ImageDiffer };
