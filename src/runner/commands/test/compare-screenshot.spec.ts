import * as core from '../../../core/index.js';
import { getImageDiffer } from './get-image-differ.js';
import compareScreenshot from './compare-screenshot.js';

jest.mock('../../../core/index.js', () => ({
  ...jest.requireActual('../../../core/index.js'),
  pathExists: jest.fn(),
  outputFile: jest.fn(),
}));
jest.mock('./get-image-differ.js');

const mockPathExists = core.pathExists as jest.MockedFunction<typeof core.pathExists>;
const mockOutputFile = core.outputFile as jest.MockedFunction<typeof core.outputFile>;
const mockGetImageDiffer = getImageDiffer as jest.MockedFunction<typeof getImageDiffer>;

const MOCK_SCREENSHOT = Buffer.from('mock-screenshot');

beforeEach(jest.clearAllMocks);

describe('compareScreenshot', () => {
  const tolerance = 0;
  const configurationName = 'Configuration';
  const kind = 'Kind';
  const story = 'Story';
  const filename = `${configurationName} ${kind} ${story}.png`;
  const parameters = {};

  const executeWithOptions = (options: Parameters<typeof compareScreenshot>[1]) =>
    compareScreenshot(
      MOCK_SCREENSHOT,
      options,
      tolerance,
      configurationName,
      kind,
      story,
      parameters
    );

  describe('reference image is missing', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValueOnce(false);
    });

    it('throws an error if requireReference option is true', async () => {
      const options = {
        requireReference: true,
        outputDir: `${__dirname}/outputDir`,
        referenceDir: `${__dirname}/referenceDir`,
        differenceDir: `${__dirname}/differenceDir`,
        diffingEngine: 'looks-same',
      };

      await expect(executeWithOptions(options)).rejects.toThrow(
        'No reference image found'
      );
    });

    it('adds reference image if requireReference option is false', async () => {
      const options = {
        requireReference: false,
        outputDir: `${__dirname}/outputDir`,
        referenceDir: `${__dirname}/referenceDir`,
        differenceDir: `${__dirname}/differenceDir`,
        diffingEngine: 'looks-same',
      };

      await executeWithOptions(options);

      const referencePath = `${options.referenceDir}/${filename}`;

      expect(mockOutputFile).toHaveBeenCalledWith(
        referencePath,
        MOCK_SCREENSHOT
      );
    });
  });

  describe('reference image is present', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValueOnce(true);
    });

    it('throws an error if image is different', async () => {
      mockGetImageDiffer.mockReturnValue(() => Promise.resolve(false));
      const options = {
        updateReference: false,
        outputDir: `${__dirname}/outputDir`,
        referenceDir: `${__dirname}/referenceDir`,
        differenceDir: `${__dirname}/differenceDir`,
        diffingEngine: 'looks-same',
      };

      await expect(executeWithOptions(options)).rejects.toThrow(
        'Screenshot differs from reference'
      );
    });

    it("doesn't update the reference image", async () => {
      mockGetImageDiffer.mockReturnValue(() => Promise.resolve(true));
      const options = {
        updateReference: false,
        requireReference: false,
        outputDir: `${__dirname}/outputDir`,
        referenceDir: `${__dirname}/referenceDir`,
        differenceDir: `${__dirname}/differenceDir`,
        diffingEngine: 'looks-same',
      };

      await executeWithOptions(options);

      const outputPath = `${options.outputDir}/${filename}`;

      expect(mockOutputFile).toHaveBeenCalledWith(outputPath, MOCK_SCREENSHOT);
    });
  });
});
