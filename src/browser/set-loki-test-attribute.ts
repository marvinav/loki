/* eslint-disable no-param-reassign */

const setLokiTestAttribute = (window: Window & typeof globalThis) => {
  const rootElement = window.document.querySelector(':root');
  rootElement?.setAttribute('loki-test', 'true');
};

export default setLokiTestAttribute;
