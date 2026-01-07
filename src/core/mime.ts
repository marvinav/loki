/**
 * Simple MIME type utilities replacing mime-types package.
 * Only includes types commonly used for static file serving.
 */

import path from 'node:path';

const mimeTypes: Record<string, string> = {
  // HTML
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',

  // CSS
  '.css': 'text/css; charset=utf-8',

  // JavaScript
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.ts': 'application/typescript; charset=utf-8',

  // JSON
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',

  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',

  // Other
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
};

const defaultMimeType = 'application/octet-stream';

/**
 * Get the MIME type for a file path or extension
 *
 * @param filePath - File path or extension (e.g., 'file.html' or '.html')
 * @returns MIME type string or undefined if unknown
 */
function contentType(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext];
}

/**
 * Get the MIME type with fallback to default
 */
function contentTypeOrDefault(filePath: string): string {
  return contentType(filePath) ?? defaultMimeType;
}

/**
 * Lookup MIME type by extension
 */
function lookup(ext: string): string | undefined {
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return mimeTypes[normalizedExt];
}

export { contentType, contentTypeOrDefault, lookup, defaultMimeType };
