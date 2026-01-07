import path from 'node:path';

interface StackTraceLine {
  file: string;
  methodName: string;
  lineNumber: number;
  column: number;
}

interface SerializedError {
  isSerializedError: true;
  type: string;
  args: unknown[];
}

class LokiError extends Error {
  originalArgs: unknown[];

  constructor(message: string, errorType: string, originalArgs: unknown[]) {
    super(message);
    this.name = errorType;
    this.originalArgs = originalArgs;
  }
}

class ReferenceImageError extends LokiError {
  kind: string;
  story: string;

  constructor(message: string, kind: string, story: string) {
    super(message, 'ReferenceImageError', [message, kind, story]);
    this.kind = kind;
    this.story = story;
  }
}

class TimeoutError extends LokiError {
  constructor(duration: number, operationName = 'Operation') {
    super(
      `${operationName} timed out after ${duration}ms`,
      'TimeoutError',
      [duration, operationName]
    );
  }
}

class MissingDependencyError extends LokiError {
  instructions: string | undefined;

  constructor(dependencyName: string, instructions?: string) {
    super(
      `${dependencyName} is not installed`,
      'MissingDependencyError',
      [dependencyName, instructions]
    );
    this.instructions = instructions;
  }
}

class ServerError extends LokiError {
  instructions: string | undefined;

  constructor(message: string, instructions?: string) {
    super(message, 'ServerError', [message, instructions]);
    this.instructions = instructions;
  }
}

class FetchingURLsError extends LokiError {
  failedURLs: string[];

  constructor(failedURLs: string[]) {
    const noun = failedURLs.length === 1 ? 'request' : 'requests';
    const message = `${failedURLs.length} ${noun} failed to load; ${failedURLs.join(', ')}`;
    super(message, 'FetchingURLsError', [failedURLs]);
    this.failedURLs = failedURLs;
  }
}

function formatStackTraceLine({
  file,
  methodName,
  lineNumber,
  column,
}: StackTraceLine): string {
  return `at ${methodName} (${path.relative('.', file)}:${lineNumber}:${column})`;
}

class NativeError extends LokiError {
  rawStack: StackTraceLine[] | undefined;
  isFatal: boolean;

  constructor(message: string, stack?: StackTraceLine[], isFatal = true) {
    super(message, 'NativeError', [message, stack, isFatal]);
    this.rawStack = stack;
    if (stack) {
      this.stack = stack.map(formatStackTraceLine).join('\n');
    }
    this.isFatal = isFatal;
  }
}

class ChromeError extends LokiError {
  instructions: string | undefined;

  constructor(message: string, instructions?: string) {
    super(message, 'ChromeError', [message, instructions]);
    this.instructions = instructions;
  }
}

const serializeError = (error: Error): string =>
  JSON.stringify({
    isSerializedError: true,
    type: error instanceof LokiError ? error.name : 'Error',
    args: error instanceof LokiError ? error.originalArgs : [error.message],
  } satisfies SerializedError);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ErrorClass = new (...args: any[]) => Error;

const errorTypes: Record<string, ErrorClass> = {
  ReferenceImageError,
  TimeoutError,
  MissingDependencyError,
  FetchingURLsError,
  ServerError,
  NativeError,
  ChromeError,
};

const parseError = (jsonString: unknown): Error | string | unknown => {
  if (typeof jsonString !== 'string') {
    return jsonString;
  }

  let jsonObject: SerializedError;
  try {
    jsonObject = JSON.parse(jsonString) as SerializedError;
  } catch {
    return new Error(jsonString.replace(/^[a-zA-Z]*Error: /, ''));
  }

  if (!jsonObject.isSerializedError) {
    return jsonString;
  }

  const ErrorClassType = errorTypes[jsonObject.type];
  if (ErrorClassType) {
    return new ErrorClassType(...jsonObject.args);
  }
  return new Error(String(jsonObject.args[0] ?? 'Unknown error'));
};

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
};

export type { StackTraceLine, SerializedError };
