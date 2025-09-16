const fs = require('fs');
const looksSame = require('looks-same');

function createFileSync (file) {
  let stats
  try {
    stats = fs.statSync(file)
  } catch { }
  if (stats && stats.isFile()) return

  const dir = path.dirname(file)
  try {
    if (!fs.statSync(dir).isDirectory()) {
      // parent is not a directory
      // This is just to cause an internal ENOTDIR error to be thrown
      fs.readdirSync(dir)
    }
  } catch (err) {
    // If the stat call above failed because the directory doesn't exist, create it
    if (err && err.code === 'ENOENT') mkdir.mkdirsSync(dir)
    else throw err
  }

  fs.writeFileSync(file, '')
}


function createLooksSameDiffer(config) {
  return function getImageDiff(path1, path2, diffPath, tolerance) {
    const instanceConfig = { tolerance, ...config };
    return new Promise(async (resolve, reject) => {
      const [reference, current] = (
        await Promise.all([fs.readFile(path1), fs.readFile(path2)])
      ).map(Buffer.from);

      if (current.equals(reference)) {
        return resolve(true);
      }
      if (reference.length === 0) {
        return reject(new Error('Reference image is empty'));
      }
      if (current.length === 0) {
        return reject(new Error('Current image is empty'));
      }

      return looksSame(reference, current, instanceConfig, (err, isSame) => {
        if (err) {
          reject(err);
        } else if (isSame) {
          resolve(isSame);
        } else {
          fs.ensureFileSync(diffPath);
          looksSame.createDiff(
            {
              ...instanceConfig,
              reference,
              current,
              diff: diffPath,
              highlightColor: '#ff00ff',
            },
            (diffErr) => {
              if (diffErr) {
                reject(diffErr);
              }
              resolve(false);
            }
          );
        }
      });
    });
  };
}

module.exports = createLooksSameDiffer;
