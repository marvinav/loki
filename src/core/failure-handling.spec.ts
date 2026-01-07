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
    const mockFn = jest.fn(async () => {
      throw new Error('output');
    });
    const retriedMockFn = withRetries(3, 10)(mockFn);

    const startTime = Date.now();
    await expect(retriedMockFn('input')).rejects.toThrow('output');
    const endTime = Date.now();

    // Should have paused 3 times (after first 3 attempts, not after the last one)
    // With 10ms backoff, total time should be at least 30ms
    expect(endTime - startTime).toBeGreaterThanOrEqual(25);
    expect(mockFn).toHaveBeenCalledTimes(4);
  });
});
