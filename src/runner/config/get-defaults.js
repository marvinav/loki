/* eslint-disable global-require, import/no-dynamic-require */
function getDefaults() {
  const defaults = require('./defaults-react.json');
  return Object.assign({}, defaults, {
    configurations: defaults.configurations,
  });
}

module.exports = getDefaults;
