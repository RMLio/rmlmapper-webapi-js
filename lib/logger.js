/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const winston = require('winston');
let logger;

function createLogger(logLevel) {
  logger = winston.createLogger({
    level: logLevel,
    format: winston.format.json(),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ]
  });

  return logger;
}

module.exports = createLogger;
