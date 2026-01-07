/**
 * Ready state manager for tracking async operations.
 * Used in browser context to wait for pending promises before screenshot capture.
 */

interface ReadyStateManager {
  registerPendingPromise: (promise: Promise<unknown>) => void;
  resetPendingPromises: () => void;
  awaitReady: () => Promise<boolean>;
}

function createReadyStateManager(): ReadyStateManager {
  let pendingPromises: Promise<unknown>[] = [];

  function registerPendingPromise(promise: Promise<unknown>): void {
    pendingPromises.push(promise);
  }

  function resetPendingPromises(): void {
    pendingPromises = [];
  }

  function awaitReady(): Promise<boolean> {
    return Promise.all(pendingPromises.splice(0)).then(() => {
      if (pendingPromises.length) {
        return awaitReady();
      }
      return true;
    });
  }

  return {
    registerPendingPromise,
    resetPendingPromises,
    awaitReady,
  };
}

export default createReadyStateManager;
export { createReadyStateManager };
export type { ReadyStateManager };
