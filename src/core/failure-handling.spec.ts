import { withRetries } from './failure-handling.js';

describe('withRetries', () => {
  it('returns a function', () => {
    const fn = async (): Promise<void> => {};
    expect(withRetries(1)(fn)).toEqual(expect.any(Function));
  });

  it('calls the original function', async () => {
    const mockFn = jest.fn(async () => 'output');
    const retriedMockFn = withRetries(1)(mockFn);
    const output = await retriedMockFn('input');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('input');
    expect(output).toBe('output');
  });

  it('calls the original function 4 times if passing 3 retries', async () => {
    const mockFn = jest.fn(async () => {
      throw new Error('output');
    });
    const retriedMockFn = withRetries(3)(mockFn);
    await expect(retriedMockFn('input')).rejects.toThrow('output');
    expect(mockFn).toHaveBeenCalledTimes(4);
  });

  it('pauses between each attempt when passing backoff argument', async () => {
    jest.useFakeTimers();
    const mockFn = jest.fn(async () => {
      throw new Error('output');
    });
    const retriedMockFn = withRetries(3, 100)(mockFn);
    const outputPromise = retriedMockFn('input');

    // Run through all timers and ticks
    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    }

    await expect(outputPromise).rejects.toThrow('output');
    expect(mockFn).toHaveBeenCalledTimes(4);

    jest.useRealTimers();
  });
});
