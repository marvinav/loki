/**
 * Shared type definitions for Loki.
 */

/**
 * Loki-specific story parameters for configuring screenshot capture.
 */
export interface LokiParameters {
  /** Custom CSS selector for screenshot capture */
  chromeSelector?: string;
  /** Skip this story in visual testing */
  skip?: boolean;
  /** Additional loki parameters */
  [key: string]: unknown;
}

/**
 * Story parameters including loki-specific options.
 */
export interface StoryParameters {
  /** Loki-specific parameters */
  loki?: LokiParameters;
  /** Additional framework parameters */
  [key: string]: unknown;
}

/**
 * Base story properties shared by all story types.
 */
export interface StoryBase {
  /** Unique story identifier */
  id: string;
  /** Story group/component name */
  kind: string;
  /** Individual story name */
  story: string;
  /** Story parameters including loki configuration */
  parameters?: StoryParameters;
}

/**
 * A story served from a local directory.
 * Used for file:// protocol or local static server.
 */
export interface StoryLocal extends StoryBase {
  /** Directory where static files are stored (absolute path) */
  baseDir: string;
  /** Path to the story file relative to baseDir (no scheme, no domain) */
  staticPath: string;
}

/**
 * A story served from a network URL.
 * Used for http:// or https:// protocols.
 */
export interface StoryNetwork extends StoryBase {
  /** Full URL to the story */
  url: string;
}

/**
 * A story can be either local (file-based) or network (URL-based).
 */
export type Story = StoryLocal | StoryNetwork;

/**
 * Type guard to check if a story is local.
 */
export function isStoryLocal(story: Story): story is StoryLocal {
  return 'baseDir' in story && 'staticPath' in story;
}

/**
 * Type guard to check if a story is network-based.
 */
export function isStoryNetwork(story: Story): story is StoryNetwork {
  return 'url' in story;
}

/**
 * The stories.json file format - an array of Story objects.
 */
export type StoriesJson = Story[];
