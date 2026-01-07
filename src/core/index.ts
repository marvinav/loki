// Error types
export {
  serializeError,
  parseError,
  LokiError,
  ReferenceImageError,
  TimeoutError,
  MissingDependencyError,
  FetchingURLsError,
  ServerError,
  NativeError,
  ChromeError,
} from './errors.js';

export type { StackTraceLine, SerializedError } from './errors.js';

// Failure handling
export { withTimeout, withRetries, unwrapError, sleep } from './failure-handling.js';

// Dependency detection
export { dependencyAvailable, ensureDependencyAvailable } from './dependency-detection.js';

// URL utilities
export { getAbsoluteURL } from './get-absolute-url.js';

// Network utilities
export { getLocalIPAddress } from './get-local-ip-address.js';

// Static server
export { createStaticServer } from './create-static-server.js';

// File system utilities
export {
  pathExists,
  pathExistsSync,
  ensureDir,
  ensureDirSync,
  emptyDirSync,
  outputFile,
  outputFileSync,
  readJson,
  readJsonSync,
  outputJson,
  outputJsonSync,
  copySync,
  moveSync,
  readdirSync,
  readFileSync,
} from './fs-utils.js';

// Object utilities
export {
  groupBy,
  toPairs,
  fromPairs,
  mapObjIndexed,
  map,
  pickBy,
} from './object-utils.js';

// Logger
export { createLogger } from './logger.js';
export type { Logger } from './logger.js';

// MIME types
export { contentType, contentTypeOrDefault, lookup } from './mime.js';

// Command existence
export { commandExists, hasCommand } from './command-exists.js';

// Concurrency
export { eachOfLimit, mapLimit, processBatches } from './concurrent.js';
