/* eslint-env browser */

interface LokiWindow extends Window {
  loki?: {
    isRunning?: boolean;
  };
}

export default function isLokiRunning(
  win: LokiWindow = window as LokiWindow
): boolean {
  return Boolean(win.loki?.isRunning);
}
