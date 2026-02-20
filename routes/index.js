const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const RMLMapperWrapper = require('@rmlio/rmlmapper-java-wrapper');
const YAML = require('yamljs');
const logger = require('../lib/logger');

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

  const rmlmapper = new RMLMapperWrapper(config.rmlmapper.path, config.tempFolder, true, config.stateFolder, config.stateFolderTimeToLive, { 'Dfile.encoding': 'UTF-8' });
  let burp;
  if (config.supportBurp) {
    config.burpTempFolder = path.join(config.tempFolder, 'burp');
    if (!fs.existsSync(config.burpTempFolder)) {
      fs.mkdirSync(config.burpTempFolder);
    }
    config.burpStateFolder = path.join(config.burpTempFolder, 'function_state');
    if (!fs.existsSync(config.burpStateFolder)) {
      fs.mkdirSync(config.burpStateFolder);
    }
    config.burpStateFolderTimeToLive = config.stateFolderTimeToLive;
    // note that the RMLMapperWrapper version in use is hacked to supports burp (final parameter true)
    burp = new RMLMapperWrapper(config.burp.path, config.burpTempFolder, true, config.burpStateFolder, config.burpStateFolderTimeToLive, { 'Dfile.encoding': 'UTF-8' }, true);
  }

  const swaggerYAML = fs.readFileSync(path.resolve(__dirname, '../swagger.yaml'), 'utf-8');
  const swaggerObj = YAML.parse(swaggerYAML);

  swaggerObj.servers = [
    { url: `${config.baseURL}${config.basePath}` }
  ];
  swaggerObj.info.version = config.version;

  router.get('/', function (req, res) {
    res.render('index', { swagger: JSON.stringify(swaggerObj) });
  });

  router.post('/execute', async function (req, res) {
    res.type('json');

    if (!req.body.rml) {
      res.status(400).send({ message: `The parameter "rml" is required.` });
    } else {
      const options = { sources, generateMetadata, serialization, functionStateId } = req.body;
      try {
        logger.info('Calling mapping engine RMLMapper.');
        const result = await rmlmapper.execute(req.body.rml, options);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message, log: error.log, stack: error.stack });
      }
    }
  });

  router.post('/executeBurp', async function (req, res) {
    res.type('json');

    if (!config.supportBurp) {
      res.status(400).send({ message: `BURP support is not enabled on this server.` });
      return;
    }

    if (!req.body.rml) {
      res.status(400).send({ message: `The parameter "rml" is required.` });
    } else {
      const options = { sources, generateMetadata, serialization, functionStateId } = req.body;
      try {
        logger.info('Calling mapping engine BURP.');
        const result = await burp.execute(req.body.rml, options);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message, log: error.log, stack: error.stack });
      }
    }
  });

  return router;
}

module.exports = createRouter;
