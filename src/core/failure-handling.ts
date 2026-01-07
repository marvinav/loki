import { TimeoutError } from './errors.js';

type AsyncFunction<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

/**
 * Wrap a function or promise with a timeout
 */
function withTimeout(timeout: number, operationName?: string) {
  const awaitPromise = <T>(promise: Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      let cancelled = false;

      const timer = setTimeout(() => {
        cancelled = true;
        reject(new TimeoutError(timeout, operationName));
      }, timeout);

      promise
        .then((result) => {
          if (!cancelled) {
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            clearTimeout(timer);
            reject(err);
          }
        });
    });

  return <TArgs extends unknown[], TResult>(
    fnOrPromise: AsyncFunction<TArgs, TResult> | Promise<TResult>
  ) => {
    if (typeof fnOrPromise === 'function') {
      return (...args: TArgs) =>
        awaitPromise((fnOrPromise as AsyncFunction<TArgs, TResult>)(...args));
    }
    return awaitPromise(fnOrPromise as Promise<TResult>);
  };
}

const sleep = (duration: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, duration));

/**
 * Wrap a function with retry logic
 */
function withRetries<TArgs extends unknown[], TResult>(
  maxRetries = 3,
  backoff = 0
): (fn: AsyncFunction<TArgs, TResult>) => AsyncFunction<TArgs, TResult> {
  return (fn: AsyncFunction<TArgs, TResult>) =>
    async (...args: TArgs): Promise<TResult> => {
      let tries = 0;
      let lastError: unknown;

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

      throw lastError;
    };
}

interface ErrorWithOriginal extends Error {
  originalError?: Error;
}

/**
 * Unwrap nested errors from retry/timeout wrappers
 */
function unwrapError(rawError: Error): Error {
  let error: Error = rawError;

  // Unwrap retry/timeout errors
  while ((error as ErrorWithOriginal).originalError) {
    error = (error as ErrorWithOriginal).originalError!;
  }

  return error;
}

export { withTimeout, withRetries, unwrapError, sleep, TimeoutError };
