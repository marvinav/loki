import path from 'node:path';

/**
 * Convert file: URLs to absolute paths
 */
function getAbsoluteURL(url: string): string {
  if (url && url.indexOf('file:') === 0) {
    return `file:${path.resolve(url.substring('file:'.length))}`;
  }
  return url;
}

export default getAbsoluteURL;
export { getAbsoluteURL };
