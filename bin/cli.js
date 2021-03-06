#!/usr/bin/env node

/**
 * Module dependencies.
 */

const path = require('path');
const App = require('..');
const http = require('http');
const download = require('../lib/downloadrmlmapper');
const fs = require('fs-extra');
const winston = require('winston');
const logger = require('../lib/logger');
const program = require('commander');
const pkg = require('../package.json');

const DEFAULT_RMLMAPPER_PATH = path.resolve(__dirname, '../rmlmapper.jar');
const DEFAULT_RMLMAPPER_VERSION_PATH = path.resolve(__dirname, '../rmlmapper-version.txt');
const configPath = path.resolve(process.cwd(), 'config.json');

program
  .version(pkg.version)
  .option('-p, --port [port]', 'Port of the server (default: 4000).')
  .option('-e, --baseURL [url]', 'Url of the server (default: http://localhost:4000).')
  .option('-r, --rmlmapper [path]', 'Path to the RMLMapper jar (default: rmlmapper.jar).')
  .option('--rmlmapper-version [version]', 'Version of the used RMLMapper.')
  .option('-t, --removeTempFolders', 'True if temp folders should be removed, else false (default: true).')
  .option('-b, --basePath [path]', 'The path preceding all routes (default: /).')
  .option('-l, --logLevel [level]', 'The log level used by the logger (default: info).')
  .parse(process.argv);

let server;
let config = {
  version: pkg.version
};
let configFile = {
  rmlmapper: {}
};

if (fs.pathExistsSync(configPath)) {
  configFile = require(configPath);
}

config.logLevel = program.logLevel || configFile.logLevel || 'info';
config.port = parseInt(program.port) || parseInt(config.port) || 4000;
config.baseURL = program.baseURL || configFile.baseURL || 'http://localhost:' + config.port;
config.basePath = program.basePath || configFile.basePath || '/';
config.rmlmapper = {};

config.rmlmapper.path = program.rmlmapper;
config.rmlmapper.version = program.rmlmapperVersion;

if (!config.rmlmapper.path && configFile.rmlmapper) {
  config.rmlmapper.path = configFile.rmlmapper.path;
}

if (!config.rmlmapper.version && configFile.rmlmapper) {
  config.rmlmapper.version = configFile.rmlmapper.version;
}

if (!config.basePath.startsWith('/')) {
  config.basePath = '/' + config.basePath;
}

logger.configure({
  level: config.logLevel,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// we do this if again, because the config needs to be read first before we can start the logger.
if (fs.pathExistsSync(configPath)) {
  logger.info(`Using config file at ${configPath}.`);
}

start();

async function start() {
  /**
   * Check if RMLMapper is defined.
   */

  if (!config.rmlmapper || !config.rmlmapper.path) {
    logger.info('No path to an RMLMapper jar is defined.');
    let version;

    if (!fs.existsSync(DEFAULT_RMLMAPPER_PATH)) {
      try {
        version = await download(DEFAULT_RMLMAPPER_PATH);
        fs.writeFileSync(DEFAULT_RMLMAPPER_VERSION_PATH, version, 'utf-8');

        logger.info(`Using the RMLMapper jar at ${DEFAULT_RMLMAPPER_PATH} (${version}).`);
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
    } else {
      version = fs.readFileSync(DEFAULT_RMLMAPPER_VERSION_PATH, 'utf-8').replace('\n', '');
      logger.info(`Using the default jar at ${DEFAULT_RMLMAPPER_PATH} (${version}).`);
    }

    config.rmlmapper = {
      path: DEFAULT_RMLMAPPER_PATH,
      version
    };
  } else {
    logger.info(`Using the RMLMapper jar at ${config.rmlmapper.path} (${config.rmlmapper.version}).`);
  }

  if (!config.rmlmapper.version) {
    logger.info(`The version of the RMLMapper is not specified.`);
  }

  /**
   * Get port from environment and store in Express.
   */

  const app = new App(config);
  app.set('port', config.port);

  /**
   * Create HTTP server.
   */

  server = http.createServer(app);

  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(config.port);
  server.on('error', onError);
  server.on('listening', onListening);
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error('Port ' + config.port + ' requires elevated privileges.');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error('Port ' + config.port + ' is already in use.');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  logger.info('Listening on port ' + server.address().port + '.');
}

