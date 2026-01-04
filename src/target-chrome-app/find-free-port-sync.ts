import { execSync } from 'child_process';

const PORT_MIN = 1024;
const PORT_MAX = 65534;
const MAX_ATTEMPTS = 1000;

function getUsedPorts(): Set<number> {
  try {
    const output = execSync('netstat -an', { encoding: 'utf-8' });
    const portRegex = /[.:]\d+\s/g;
    const ports = new Set<number>();
    let match;
    while ((match = portRegex.exec(output)) !== null) {
      const portStr = match[0].slice(1, -1);
      const port = parseInt(portStr, 10);
      if (port >= PORT_MIN && port <= PORT_MAX) {
        ports.add(port);
      }
    }
    return ports;
  } catch {
    return new Set();
  }
}

function findFreePortSync(): number {
  const usedPorts = getUsedPorts();

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const port = Math.floor(Math.random() * (PORT_MAX - PORT_MIN) + PORT_MIN);
    if (!usedPorts.has(port)) {
      return port;
    }
  }

  throw new Error('Unable to find a free port');
}

export default findFreePortSync;
