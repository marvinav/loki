// const { createGraphicsMagickDiffer } = require('../../../../diff-graphics-magick/src');
const { createLooksSameDiffer } = require('../../../../diff-looks-same/src');
// const { createPixelmatchDiffer } = require('../../../../diff-pixelmatch/src');

function getImageDiffer(engine, config) {
  switch (engine) {
    case undefined:
    case 'pixelmatch': {
      throw new Error('pixelmatch engine not available - package not found');
    }
    case 'looks-same': {
      return createLooksSameDiffer(config);
    }
    case 'gm': {
      throw new Error('GraphicsMagick engine not available - package not found');
    }
    default: {
      throw new Error(`Unsupported engine "${engine}"`);
    }
  }
}

module.exports = { getImageDiffer };
