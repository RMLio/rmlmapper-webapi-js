const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const RMLMapperWrapper = require('@rmlio/rmlmapper-java-wrapper');
const YAML = require('yamljs');

const dir = path.join(__dirname, '../');
const defaultTempFolder = dir + path.sep + "tmp";

function createRouter(config) {
  const router = express.Router();

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
  if (!path.isAbsolute(config.rmlmapper.path)) {
    config.rmlmapper.path = path.resolve(process.cwd(), config.rmlmapper.path);
  }

  const swaggerYAML = fs.readFileSync(path.resolve(__dirname, '../swagger.yaml'), 'utf-8');
  const swaggerObj = YAML.parse(swaggerYAML);

  swaggerObj.servers = [
    {url : `${config.baseURL}${config.basePath}`}
  ];
  swaggerObj.info.version = config.version;

  router.get('/', function (req, res) {
    res.render('index', {swagger: JSON.stringify(swaggerObj)});
  });

  router.post('/execute', async function (req, res) {
    res.type('json');

    if (!req.body.rml) {
      res.status(400).send({message: `The parameter "rml" is required.`});
    } else {
      const options = {sources, generateMetadata, serialization } = req.body;

      const javaVMOptions = {'Dfile.encoding': 'UTF-8'};

      // Check if request has session timestamp in body. If so, add it to the JVM options
      // so that it can be used to create a file for stateful functions.
      if (req.body.functionStateId) {
        javaVMOptions.DifState = path.join(config.tempFolder, req.body.functionStateId);
      }
      try {
        const rmlmapper = new RMLMapperWrapper(config.rmlmapper.path, config.tempFolder, true, javaVMOptions);
        const result = await rmlmapper.execute(req.body.rml, options);
        res.send(result);
      } catch (error) {
        res.status(500).send({message: error.message, log: error.log, stack: error.stack});
      }
    }
  });

  return router;
}

module.exports = createRouter;
