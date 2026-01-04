const awaitSelectorPresent = (
  window: Window & typeof globalThis,
  selector: string,
  timeout = 10000
) =>
  new Promise<void>((resolve, reject) => {
    let resolutionTimer: ReturnType<typeof setTimeout> | undefined;
    const rejectionTimer = setTimeout(() => {
      if (resolutionTimer) {
        clearTimeout(resolutionTimer);
      }
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    const waitForSelector = () => {
      if (window.document.querySelector(selector)) {
        clearTimeout(rejectionTimer);
        resolve();
      } else {
        resolutionTimer = setTimeout(waitForSelector, 100);
      }
    };

    waitForSelector();
  });

export default awaitSelectorPresent;
