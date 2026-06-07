'use strict';

function createLogger(prefix) {
  return {
    log: (...args) => console.log(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    errorLog: (...args) => console.error(prefix, ...args)
  };
}

module.exports = { createLogger };
