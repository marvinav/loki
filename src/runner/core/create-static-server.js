/* eslint-disable consistent-return */
const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  // Text
  "txt": "text/plain",
  "csv": "text/csv",
  "html": "text/html",
  "css": "text/css",
  "js": "application/javascript",
  "json": "application/json",
  "xml": "application/xml",

  // Images
  "jpg": "image/jpeg",
  "jpeg": "image/jpeg",
  "png": "image/png",
  "gif": "image/gif",
  "bmp": "image/bmp",
  "webp": "image/webp",
  "svg": "image/svg+xml",
  "ico": "image/x-icon",

  // Audio
  "mp3": "audio/mpeg",
  "wav": "audio/wav",
  "ogg": "audio/ogg",
  "m4a": "audio/mp4",

  // Video
  "mp4": "video/mp4",
  "webm": "video/webm",
  "ogv": "video/ogg",
  "mov": "video/quicktime",
  "avi": "video/x-msvideo",
  "mkv": "video/x-matroska",

  // Fonts
  "woff": "font/woff",
  "woff2": "font/woff2",
  "ttf": "font/ttf",
  "otf": "font/otf",
  "eot": "application/vnd.ms-fontobject",

  // Documents
  "pdf": "application/pdf",
  "doc": "application/msword",
  "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "xls": "application/vnd.ms-excel",
  "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "ppt": "application/vnd.ms-powerpoint",
  "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Archives
  "zip": "application/zip",
  "tar": "application/x-tar",
  "gz": "application/gzip",
  "rar": "application/vnd.rar",
  "7z": "application/x-7z-compressed"
};


const getContentType = (fileName) => {
  const ext = path.extname(filePath).slice(1).toLowerCase();

  return mimeTypes[ext];
}

async function sendFile(res, filePath) {
  const file = await fs.promises.open(filePath, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile()) {
      const err = new Error('Path is directory');
      err.code = 'EISDIR';
      throw err;
    }
    const contentType = getContentType(filePath);

    const headers = {
      'Content-Length': stat.size,
      'Cache-Control': 'no-store, must-revalidate',
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    res.writeHead(200, headers);

    const readStream = file.createReadStream({ autoClose: true });
    readStream.pipe(res, { end: true });
    readStream.on('close', () => {
      file.close();
    });
  } catch (err) {
    file.close();
    throw err;
  }
}

const createStaticServer = (dir) =>
  http.createServer(async (req, res) => {
    const url = new URL(`http://localhost${req.url}`);
    const staticFilePath = path.normalize(
      path.join(dir, url.pathname === '/' ? 'index.html' : url.pathname)
    );
    if (staticFilePath.startsWith(dir)) {
      try {
        return await sendFile(res, staticFilePath);
      } catch (err) {
        if (err.code !== 'ENOENT' && err.code !== 'EISDIR') {
          throw err;
        }
      }
    }
  });

module.exports = { createStaticServer };
