/* eslint-disable no-underscore-dangle */
import { Story, StorybookWindow } from './types.js';

type StoryGetter = (() => Story[]) | undefined;

const blockedParams = [
  'actions',
  'argTypes',
  'backgrounds',
  'controls',
  'docs',
  'framework',
  'storySource',
];

const isSerializable = (value: unknown) => {
  try {
    JSON.stringify(value);
    return true;
  } catch (_e) {
    return false;
  }
};

const filterParameters = (parameters?: Story['parameters']) =>
  Object.fromEntries(
    Object.entries((parameters ?? {}) as Record<string, unknown>).filter(
      ([key, value]) =>
        !key.startsWith('__') &&
        !blockedParams.includes(key) &&
        isSerializable(value)
    )
  );

const shouldSkipStory = (parameters?: Story['parameters']) =>
  Boolean((parameters as { loki?: { skip?: boolean } } | undefined)?.loki?.skip);

const getStories = async (window: StorybookWindow): Promise<Story[]> => {
  const getStorybook: StoryGetter =
    window.__STORYBOOK_CLIENT_API__?.raw ??
    (window.__STORYBOOK_PREVIEW__?.extract &&
      window.__STORYBOOK_PREVIEW__?.storyStore?.raw) ??
    window.loki?.getStorybook;

  if (!getStorybook) {
    throw new Error(
      "Unable to get stories. Try adding `import 'loki/configure-react'` to your .storybook/preview.js file."
    );
  }

  if (window.__STORYBOOK_PREVIEW__?.extract) {
    // New official API to extract stories from preview
    await window.__STORYBOOK_PREVIEW__.extract();

    // Deprecated, will be removed in V9
    const stories = window.__STORYBOOK_PREVIEW__.storyStore?.raw();

    if (!stories) {
      return [];
    }

    return stories
      .map((component) => ({
        id: component.id,
        kind: component.kind,
        story: component.story,
        parameters: filterParameters(component.parameters),
      }))
      .filter(({ parameters }) => !shouldSkipStory(parameters));
  }

  if (window.__STORYBOOK_CLIENT_API__?.storyStore?.cacheAllCSFFiles) {
    await window.__STORYBOOK_CLIENT_API__.storyStore.cacheAllCSFFiles();
  }

  return getStorybook()
    .map((component) => ({
      id: component.id,
      kind: component.kind,
      story: component.story,
      parameters: filterParameters(component.parameters),
    }))
    .filter(({ parameters }) => !shouldSkipStory(parameters));
};

export default getStories;
