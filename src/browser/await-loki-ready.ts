import { LokiWindow } from './types.js';

const awaitLokiReady = (window: LokiWindow) =>
  window.loki?.awaitReady?.();

export default awaitLokiReady;
