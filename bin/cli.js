#!/usr/bin/env node

/**
 * Module dependencies.
 */

const path = require('path');
const App = require('..');
const http = require('http');
const download = require('../lib/download-rmlmapper');
const fs = require('fs-extra');
const logger = require('../lib/logger');
const program = require('commander');
const pkg = require('../package.json');

const configPath = path.resolve(process.cwd(), 'config.json');

program
  .version(pkg.version)
  .option('-p, --port [port]', 'Port of the server (default: 4000).', parseInt)
  .option('-e, --baseURL [url]', 'Url of the server (default: http://localhost:4000).')
  .option('-r, --rmlmapper [path]', 'Path to the RMLMapper jar (default: rmlmapper.jar).')
  .option('--rmlmapper-version [version]', 'Version of the used RMLMapper.')
  .option('-t, --removeTempFolders', 'True if temp folders should be removed, else false (default: true).')
  .option('-b, --basePath [path]', 'The path preceding all routes (default: /).')
  .option('-l, --logLevel [level]', 'The log level used by the logger (default: info).')
  .option('-o, --behind-reverse-proxy', 'Enable if the server is behind a reverse proxy (e.g., NGINX).')
  .option('--rate-limiter-window [minutes]', 'The window of the rate limiter (default: infinity).', parseInt)
  .option('--rate-limiter-max [integer]', 'The max requests allowed by the rate limiter (default: infinity).', parseInt)
  .option('--stateFolder [path]', 'Path for RMLMapper to keep state (default: tempFolder + "/function_state").', parseInt)
  .option('--stateFolderTTL [seconds]', 'Minimal time to keep state used by RMLMapper (default: 600).', parseInt)
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
config.port = program.port || config.port || 4000;
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

// we do this if again, because the config needs to be read first before we can start the logger.
if (fs.pathExistsSync(configPath)) {
  logger.info(`Using config file at ${configPath}.`);
}

// Process rate limit arguments
if ((program.rateLimiterWindow && !program.rateLimiterMax)
  || (!program.rateLimiterWindow && program.rateLimiterMax)) {
  logger.error(`Please provide both window and max of the rate limiter.`);
  process.exit(1);
} else {
  const rateLimiterFromConfigFile = configFile.rateLimiter ? configFile.rateLimiter : {};
  config.rateLimiter = {};

  config.rateLimiter.window = program.rateLimiterWindow || rateLimiterFromConfigFile.window;
  config.rateLimiter.max = program.rateLimiterMax || rateLimiterFromConfigFile.max;

  if (!config.rateLimiter.window || !config.rateLimiter.max) {
    config.rateLimiter = null;
  }
}

config.behindReverseProxy = program.behindReverseProxy || configFile.behindReverseProxy || false;

// process RMLMapper state arguments
config.stateFolder = program.stateFolder || configFile.stateFolder;
config.stateFolderTimeToLive = program.stateFolderTTL || configFile.stateFolderTTL;

start();

async function start() {
  /**
   * Check if RMLMapper is defined.
   */

  if (!config.rmlmapper || !config.rmlmapper.path) {
    logger.info('No path to an RMLMapper jar is defined.');
    const { version, fullPath, cache } = await download(null, true);

    if (cache) {
      logger.info(`Using the default jar at ${fullPath} (${version}).`);
    } else {
      logger.info(`Using the RMLMapper jar at ${fullPath} (${version}).`);
    }

    config.rmlmapper = {
      path: fullPath,
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

