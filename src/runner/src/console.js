/* eslint-disable no-console */
const info = (message) => console.log(message);
const warn = (message) => console.warn(message);
const error = (message) => console.error(message);
const bold = (message) => console.log(message);
const die = (errorOrMessage, instructions) => {
  if (errorOrMessage instanceof Error) {
    error(errorOrMessage.message);
    info(errorOrMessage.stack);
  } else {
    error(errorOrMessage);
    if (instructions) {
      info(instructions);
    }
  }
  process.exit(1);
};

module.exports = { info, warn, error, bold, die };
