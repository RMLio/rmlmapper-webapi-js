/**
 * author: Pieter Heyvaert (pieter.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const winston = require('winston');
let logger;

function createLogger(logLevel) {
  console.log(logLevel);
  if (!logger) {
    console.log('new logger');
    logger = winston.createLogger({
      level: logLevel,
      format: winston.format.json(),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  return logger;
}

module.exports = winston.createLogger({});
