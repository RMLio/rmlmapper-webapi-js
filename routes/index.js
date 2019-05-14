const config = require('../config.json');
const pkg = require('../package');

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const RMLMapperWrapper = require('@rmlio/rmlmapper-java-wrapper');

const dir = __dirname.replace("/routes", "");
const tempDir = dir + path.sep + "tmp";

// check if temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const rmlmapper = new RMLMapperWrapper(config.paths.rmlmapper, tempDir, true);

router.get('/', (req, res) => {
  res.render('index', {
    apiVersion: pkg.version,
    rmlmapperVersion: config.versions.rmlmapper,
    url: config.urls['web-api']
  })
});

router.post('/execute', function (req, res) {
  if (!req.body.rml) {
    res.status(400).send(`The parameter "rml" is required.`);
  } else {
    rmlmapper.execute(req.body.rml, req.body.sources, req.body.generateMetadata)
      .then(result => res.send(result))
      .catch(error => {
        console.error(error);
        res.status(500).send(error.message);
      });
  }
});

module.exports = router;
