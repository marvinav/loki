import { describe, expect, it, jest, beforeEach } from '@jest/globals';

jest.mock('child_process');

import { execSync } from 'child_process';

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;

// Import after mocking
import findFreePortSync from './find-free-port-sync.js';

describe('findFreePortSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a number', () => {
    mockedExecSync.mockReturnValue('');
    const port = findFreePortSync();
    expect(typeof port).toBe('number');
  });

  it('should return a port in valid range (1024-65534)', () => {
    mockedExecSync.mockReturnValue('');
    const port = findFreePortSync();
    expect(port).toBeGreaterThanOrEqual(1024);
    expect(port).toBeLessThanOrEqual(65534);
  });

  it('should avoid ports that are in use', () => {
    // Mock netstat output showing ports 3000 and 8080 are in use
    mockedExecSync.mockReturnValue(`
Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:8080          0.0.0.0:*               LISTEN
    `);

    // Run multiple times to verify it never returns used ports
    for (let i = 0; i < 100; i++) {
      const port = findFreePortSync();
      expect(port).not.toBe(3000);
      expect(port).not.toBe(8080);
    }
  });

  it('should handle netstat failure gracefully', () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error('Command not found');
    });

    // Should still return a valid port even if netstat fails
    const port = findFreePortSync();
    expect(port).toBeGreaterThanOrEqual(1024);
    expect(port).toBeLessThanOrEqual(65534);
  });

  it('should handle empty netstat output', () => {
    mockedExecSync.mockReturnValue('');
    const port = findFreePortSync();
    expect(port).toBeGreaterThanOrEqual(1024);
    expect(port).toBeLessThanOrEqual(65534);
  });

  it('should parse ports with colon separator', () => {
    mockedExecSync.mockReturnValue('tcp 0 0 0.0.0.0:5000 0.0.0.0:* LISTEN');

    for (let i = 0; i < 50; i++) {
      const port = findFreePortSync();
      expect(port).not.toBe(5000);
    }
  });

  it('should parse ports with dot separator (macOS style)', () => {
    mockedExecSync.mockReturnValue('tcp4 0 0 *.6000 *.* LISTEN');

    for (let i = 0; i < 50; i++) {
      const port = findFreePortSync();
      expect(port).not.toBe(6000);
    }
  });
});
