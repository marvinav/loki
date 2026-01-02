import path from 'path';

const getAbsoluteURL = (url) => {
  if (url && url.indexOf('file:') === 0) {
    return `file:${path.resolve(url.substr('file:'.length))}`;
  }
  return url;
};

export default getAbsoluteURL;
