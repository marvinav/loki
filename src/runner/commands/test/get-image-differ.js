const { createLooksSameDiffer } = require('../../../diff-looks-same');

function getImageDiffer(engine, config) {
  switch (engine) {
    case 'looks-same': {
      return createLooksSameDiffer(config);
    }
    default: {
      throw new Error(`Unsupported engine "${engine}"`);
    }
  }
}

module.exports = { getImageDiffer };
