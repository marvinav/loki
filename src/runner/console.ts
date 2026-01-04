/* eslint-disable no-console */
export const info = (message: any) => console.log(message);
export const warn = (message: any) => console.warn(message);
export const error = (message: any) => console.error(message);
export const bold = (message: any) => console.log(message);
export const die = (errorOrMessage: any, instructions?: any) => {
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
