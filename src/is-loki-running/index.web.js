/* eslint-env browser */

export default function isLokiRunning(win = window) {
  return Boolean(win.loki && win.loki.isRunning);
}
