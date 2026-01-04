/* eslint no-param-reassign: ["error", { "props": false }] */

import { Loki, LokiWindow } from './types.js';

function populateLokiHelpers(
  window: LokiWindow,
  helpers: Partial<Loki> = {}
): void {
  window.loki = Object.assign({}, helpers, window.loki ?? {});
}

export default populateLokiHelpers;
