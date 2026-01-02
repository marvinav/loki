/* eslint-disable no-console */
export const info = (message) => console.log(message);
export const warn = (message) => console.warn(message);
export const error = (message) => console.error(message);
export const bold = (message) => console.log(message);
export const die = (errorOrMessage, instructions) => {
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
