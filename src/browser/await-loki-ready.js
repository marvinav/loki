const awaitLokiReady = (window) =>
  window.loki && window.loki.awaitReady && window.loki.awaitReady();

export default awaitLokiReady;
