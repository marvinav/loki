/* eslint-env browser */

interface LokiWindow extends Window {
  loki?: {
    registerPendingPromise?: (promise: Promise<unknown>) => void;
    isRunning?: boolean;
  };
}

export default function createAsyncCallback(
  win: LokiWindow = window as LokiWindow
): () => void {
  const registerPendingPromise = win.loki?.registerPendingPromise;
  let resolveAsyncStory: (() => void) | undefined;

  if (registerPendingPromise) {
    registerPendingPromise(
      new Promise<void>((resolve) => {
        resolveAsyncStory = resolve;
      })
    );
  }

  return () => {
    if (resolveAsyncStory) {
      resolveAsyncStory();
    }
  };
}
