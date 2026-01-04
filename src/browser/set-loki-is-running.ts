/* eslint-disable no-param-reassign */

import { LokiWindow } from './types.js';

const setLokiIsRunning = (window: LokiWindow) => {
  if (!window.loki) {
    window.loki = {};
  }
  window.loki.isRunning = true;
};

export default setLokiIsRunning;
