import path from 'path';

export const getAbsoluteURL = (url) => {
  if (url && url.indexOf('file:') === 0) {
    return `file:${path.resolve(url.substr('file:'.length))}`;
  }
  return url;
};
