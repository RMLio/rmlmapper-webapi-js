const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const routes = require('./routes/index');

/**
 * Create a app that can be used with an http.server.
 * @param loggerFormat: the logger format as specified by the morgan library.
 * @returns {*}
 */
function createApp(config) {
  const app = express();

// view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'pug');

  /* istanbul ignore next */
  // configure logger
  if (config.loggerFormat) {
    app.use(logger(config.loggerFormat));
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

// configure where to find public files
  app.use(express.static(path.join(__dirname, 'public')));
// add the routes
  app.use('/', routes(config));

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
