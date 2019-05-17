const pkg = require('../package');

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const RMLMapperWrapper = require('@rmlio/rmlmapper-java-wrapper');

const dir = __dirname.replace("/routes", "");
const defaultTempFolder = dir + path.sep + "tmp";

function createRouter(config) {
  /* istanbul ignore next */
  if (!config.tempFolder) {
    config.tempFolder = defaultTempFolder;
  }

  /* istanbul ignore next */
  if (!path.isAbsolute(config.tempFolder)) {
    config.tempFolder = process.cwd() + path.sep + config.tempFolder;
  }

  // check if temp directory exists
  if (!fs.existsSync(config.tempFolder)) {
    fs.mkdirSync(config.tempFolder);
  }

  /* istanbul ignore next */
  if (!path.isAbsolute(config.paths.rmlmapper)) {
    config.paths.rmlmapper = process.cwd() + path.sep + config.paths.rmlmapper;
  }

  const rmlmapper = new RMLMapperWrapper(config.paths.rmlmapper, config.tempFolder, true);

  router.get('/', (req, res) => {
    res.render('index', {
      apiVersion: pkg.version,
      rmlmapperVersion: config.versions.rmlmapper,
      url: config.urls['web-api']
    })
  });

  router.post('/execute', function (req, res) {
    res.type('json');

    if (!req.body.rml) {
      res.status(400).send({message: `The parameter "rml" is required.`});
    } else {
      rmlmapper.execute(req.body.rml, req.body.sources, req.body.generateMetadata)
        .then(result => res.send(result))
        .catch(error => {
          res.status(500).send({message: error.message, log: error.log});
        });
    }
  });

  return router;
}

module.exports = createRouter;
