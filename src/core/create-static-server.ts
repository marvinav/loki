import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { contentType } from './mime.js';

interface FileError extends Error {
  code?: string;
}

async function sendFile(
  res: http.ServerResponse,
  filePath: string
): Promise<void> {
  const file = await fs.promises.open(filePath, 'r');

  try {
    const stat = await file.stat();

    if (!stat.isFile()) {
      const err: FileError = new Error('Path is directory');
      err.code = 'EISDIR';
      throw err;
    }

    const mimeType = contentType(path.basename(filePath));

    const headers: Record<string, string | number> = {
      'Content-Length': stat.size,
      'Cache-Control': 'no-store, must-revalidate',
    };

    if (mimeType) {
      headers['Content-Type'] = mimeType;
    }

    res.writeHead(200, headers);

    const readStream = file.createReadStream({ autoClose: true });
    readStream.pipe(res, { end: true });

    readStream.on('close', () => {
      file.close().catch(() => {
        // Ignore close errors
      });
    });
  } catch (err) {
    await file.close();
    throw err;
  }
}

function createStaticServer(dir: string): http.Server {
  return http.createServer(async (req, res) => {
    const url = new URL(`http://localhost${req.url ?? '/'}`);
    const staticFilePath = path.normalize(
      path.join(dir, url.pathname === '/' ? 'index.html' : url.pathname)
    );

    if (staticFilePath.startsWith(dir)) {
      try {
        await sendFile(res, staticFilePath);
        return;
      } catch (err) {
        const fileErr = err as FileError;
        if (fileErr.code !== 'ENOENT' && fileErr.code !== 'EISDIR') {
          throw err;
        }
      }
    }

    // Return 404 for files not found or outside directory
    res.writeHead(404);
    res.end('Not Found');
  });
}

export { createStaticServer };
