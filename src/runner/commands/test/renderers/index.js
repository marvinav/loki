const { renderVerbose } = require('./verbose');
const { renderNonInteractive } = require('./non-interactive');
const { renderSilent } = require('./silent');

module.exports = {
  renderVerbose,
  renderSilent,
  renderNonInteractive,
};
