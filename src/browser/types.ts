export interface Story {
  id: string;
  kind: string;
  story: string;
  parameters?: Record<string, unknown>;
}

export interface Loki {
  awaitReady?: () => Promise<unknown>;
  registerPendingPromise?: (promise: Promise<unknown>) => void;
  getStorybook?: () => Story[];
  isRunning?: boolean;
}

export type LokiWindow = Window &
  typeof globalThis & {
    loki?: Loki;
  };

export interface StorybookClientApi {
  raw?: () => Story[];
  storyStore?: {
    raw: () => Story[];
    cacheAllCSFFiles?: () => Promise<void> | void;
  };
}

export interface StorybookPreview {
  extract?: () => Promise<void> | void;
  storyStore: {
    raw: () => Story[];
  };
}

export type StorybookWindow = LokiWindow & {
  __STORYBOOK_CLIENT_API__?: StorybookClientApi;
  __STORYBOOK_PREVIEW__?: StorybookPreview;
};
