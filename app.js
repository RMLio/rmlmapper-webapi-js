const express = require('express');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const logger = require('./lib/logger');
const routes = require('./routes/index');

/**
 * Creates an app that can be used with an http.server.
 * @param config: the config object that specifies the details of the app.
 * @returns {*}
 */
function createApp(config) {
  // Set default in config.
  config.port = config.port || 4000;
  config.logLevel = config.logLevel || 'info';
  config.baseURL = config.baseURL || 'http://localhost:' + config.port;
  config.basePath = config.basePath || '/';
  config.removeTempFolders = config.removeTempFolders === undefined || config.removeTempFolders;

  if (!config.basePath.startsWith('/')) {
    config.basePath = '/' + config.basePath;
  }

  // Set up app.
  const app = express();
  app._basePath = config.basePath;

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'pug');

  /* istanbul ignore next */
  // configure logger
  if (config.logLevel) {
    const temp = config.logLevel === 'debug' ? 'dev' : 'combined';
    app.use(morgan(temp));
  }

  // allow CORS
  app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
  });

  // configure the body of the requests
  app.use(bodyParser.json({
    extended: false,
    limit: '50mb'
  }));

  /* istanbul ignore next */
  if (config.behindReverseProxy) {
    // Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
    // see https://expressjs.com/en/guide/behind-proxies.html
    app.set('trust proxy', 1);
  }

  /* istanbul ignore next */
  if (config.rateLimiter) {
    const limiter = rateLimit({
      windowMs: config.rateLimiter.window * 60 * 1000,
      max: config.rateLimiter.max // limit each IP to "max" requests per windowMs
    });

    // apply to execute requests
    app.use('/execute', limiter);

    logger.info(`Rate limiter enabled: max ${config.rateLimiter.max} request per ${config.rateLimiter.window} minutes.`);
  }

  // configure where to find public files
  app.use(config.basePath, express.static(path.join(__dirname, 'public')));
  // add the routes
  app.use(config.basePath, routes(config));

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handlers

  /* istanbul ignore next */
  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

  /* istanbul ignore next */
  // production error handler
  // no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  return app;
}

module.exports = createApp;
