import { createLooksSameDiffer } from '../../../diff-looks-same/index.js';

export function getImageDiffer(engine, config) {
  switch (engine) {
    case 'looks-same': {
      return createLooksSameDiffer(config);
    }
    default: {
      throw new Error(`Unsupported engine "${engine}"`);
    }
  }
}
