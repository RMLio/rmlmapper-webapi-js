/**
 * author: Pieter Heyvaert (pieter.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const winston = require('winston');
let logger;

function createLogger(logLevel) {
  if (!logger) {
    logger = winston.createLogger({
      level: logLevel,
      format: winston.format.json(),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.cli()
            ),
          handleExceptions: true
        })
      ]
    });
  }

  return logger;
}

module.exports = createLogger('info');
