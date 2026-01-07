interface FileNameFormatterInput {
  configurationName: string;
  kind: string;
  story: string;
  parameters?: Record<string, unknown>;
}

type FileNameFormatter = (input: FileNameFormatterInput) => string;

interface OutputPathsOptions {
  outputDir: string;
  referenceDir: string;
  differenceDir: string;
  fileNameFormatter?: FileNameFormatter;
}

interface OutputPaths {
  outputPath: string;
  referencePath: string;
  diffPath: string;
}

const defaultFileNameFormatter: FileNameFormatter = ({
  configurationName,
  kind,
  story,
}) => `${configurationName} ${kind} ${story}`;

function getOutputPaths(
  options: OutputPathsOptions,
  configurationName: string,
  kind: string,
  story: string,
  parameters?: Record<string, unknown>
): OutputPaths {
  const getBaseName = options.fileNameFormatter ?? defaultFileNameFormatter;
  const basename = getBaseName({ configurationName, kind, story, parameters });
  const filename = `${basename}.png`;
  const outputPath = `${options.outputDir}/${filename}`;
  const referencePath = `${options.referenceDir}/${filename}`;
  const diffPath = `${options.differenceDir}/${filename}`;

  return { outputPath, referencePath, diffPath };
}

export { defaultFileNameFormatter, getOutputPaths };
export type { FileNameFormatter, OutputPathsOptions, OutputPaths };
