import * as errors from './errors.js';
import * as failureHandling from './failure-handling.js';
import * as dependencyDetection from './dependency-detection.js';
import getAbsoluteURL from './get-absolute-url.js';
import { getLocalIPAddress } from './get-local-ip-address.js';
import { createStaticServer } from './create-static-server.js';

const core = Object.assign(
  {
    getAbsoluteURL,
    getLocalIPAddress,
    createStaticServer,
  },
  errors,
  failureHandling,
  dependencyDetection
);

export default core;
export { getAbsoluteURL, getLocalIPAddress, createStaticServer };
export * from './errors.js';
export * from './failure-handling.js';
export * from './dependency-detection.js';
