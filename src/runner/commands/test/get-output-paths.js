const defaultFileNameFormatter = ({ configurationName, kind, story }) =>
  `${configurationName} ${kind} ${story}`;

function getOutputPaths(options, configurationName, kind, story, parameters) {
  const getBaseName = options.fileNameFormatter || defaultFileNameFormatter;
  const basename = getBaseName({ configurationName, kind, story, parameters });
  const filename = `${basename}.png`;
  const outputPath = `${options.outputDir}/${filename}`;
  const referencePath = `${options.referenceDir}/${filename}`;
  const diffPath = `${options.differenceDir}/${filename}`;

  return { outputPath, referencePath, diffPath };
}

module.exports = { defaultFileNameFormatter, getOutputPaths };
