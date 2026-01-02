import { TimeoutError } from './errors.js';

export const withTimeout = (timeout, operationName) => (fnOrPromise) => {
  const awaitPromise = (promise) =>
    new Promise(async (resolve, reject) => {
      let cancelled = false;
      const timer = setTimeout(() => {
        cancelled = true;
        reject(new TimeoutError(timeout, operationName));
      }, timeout);
      try {
        const result = await promise;
        if (!cancelled) {
          clearTimeout(timer);
          resolve(result);
        }
      } catch (err) {
        if (!cancelled) {
          clearTimeout(timer);
          reject(err);
        }
      }
    });

  if (typeof fnOrPromise === 'function') {
    return (...args) => awaitPromise(fnOrPromise(...args));
  }
  return awaitPromise(fnOrPromise);
};

const sleep = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration));

export const withRetries =
  (maxRetries = 3, backoff = 0) =>
    (fn) =>
      async (...args) => {
        let tries = 0;
        let lastError;
        while (tries <= maxRetries) {
          tries++;
          try {
            const result = await fn(...args);
            return result;
          } catch (err) {
            lastError = err;
          }
          if (backoff && tries <= maxRetries) {
            await sleep(backoff);
          }
        }
        if (tries === 1) {
          throw lastError;
        }
        const message = lastError.message || lastError.toString();
        const error = new Error(`Failed with "${message}" after ${tries} tries`);
        error.originalError = lastError;
        throw error;
      };

export function unwrapError(rawError) {
  let error = rawError;

  // Unwrap retry/timeout errors
  while (error.originalError) {
    error = error.originalError;
  }

  return error;
}
