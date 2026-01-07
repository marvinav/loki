import os from 'node:os';

/**
 * Get the local IPv4 address of this machine
 */
function getLocalIPAddress(): string | undefined {
  const interfaces = os.networkInterfaces();

  const ips = Object.keys(interfaces)
    .flatMap((key) => {
      const networkInterface = interfaces[key];
      if (!networkInterface) return [];

      return networkInterface
        .filter(({ family, internal }) => family === 'IPv4' && !internal)
        .map(({ address }) => address);
    });

  return ips[0];
}

export { getLocalIPAddress };
