let config = require('../config.json');
let rmwd = config.paths.rmlmapper;
let grwd = config.paths.rml2graphml;

let express = require('express');
let router = express.Router();
let exec = require('child_process').exec;
let path = require('path');
let fs = require('fs');
let http = require('http');
let request = require('request');
let N3 = require('n3');
let DataAnalysis = require("data-analysis");
let example2rml = require('example2rml');
let rml2graphml = require('RML2GraphML');
let XMLWriter = require('xml-writer');

let dir = __dirname.replace("/routes", "");
let tempDir = dir + path.sep + "tmp";
let sourceFilePrefix = "source_";

//check if temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

function writeSource(names, index, sources, prefix, callback) {
  //console.log(sources[names[index]]);

  function done() {
    if (index < names.length) {
      writeSource(names, index + 1, sources, prefix, callback);
    } else {
      callback();
    }
  }

  if (sources[names[index]]) {
    //console.log(sources[names[index]].replace('\'', "'\"'\"''"));
    //console.log('echo \'' + sources[names[index]].replace(/\'/g, "'\"'\"'") + '\' > ' + tempDir + path.sep + prefix + names[index]);
    var child = exec('echo \'' + sources[names[index]].replace(/\'/g, "'\"'\"'") + '\' > ' + tempDir + path.sep + prefix + names[index], function (error, stdout, stderr) {
      //console.log(stdout);
      //console.log(stderr);
      done();
    });
  } else {
    done();
  }
}

function saveSources(sources, prefix, callback) {
  let names = [];

  for (let name in sources) {
    names.push(name);
  }

  //console.log(names);

  writeSource(names, 0, sources, prefix, callback);
}

function setSourcesMappingFile(rml, prefix, callback) {
  let parser = N3.Parser();
  let writer = N3.Writer();

  parser.parse(rml, function (error, triple, prefixes) {
    if (triple) {
      if (triple.predicate === 'http://semweb.mmlab.be/ns/rml#source' && N3.Util.isLiteral(triple.object)) {
        triple.object = N3.Util.createLiteral(tempDir + path.sep + prefix + N3.Util.getLiteralValue(triple.object));
      }

      writer.addTriple(triple.subject, triple.predicate, triple.object);
    } else {
      writer.end(function (error, result) {
        if (error) {
          console.log(error);
        }
        //console.log(result);
        callback(result);
      });
    }
  })
}

function setSourceGraphmlFile(original, path) {
  let regex = /rml:source .+;/g;
  let updated = original.replace(regex, 'rml:source "' + path + '" ;');
  //console.log(updated);
  return updated;
}

router.post('/process', function (req, res) {
  let ms = new Date().getTime();
  let prefix = sourceFilePrefix + ms + "_";
  let logFile = tempDir + path.sep + "log_" + ms + ".log";

  //console.log(JSON.parse(req.body.sources));

  let callback = function () {
    let mappingFile = tempDir + path.sep + "mapdoc_" + ms + ".rml";

    setSourcesMappingFile(req.body.rml, prefix, function (rml) {
      fs.writeFile(mappingFile, rml, function (error) {
        let format = req.body.format ? req.body.format : "rdfjson";
        let outputFile = tempDir + path.sep + "result_" + ms + ".ttl";

        let child = exec('cd ' + rmwd + '; java -jar RML-Mapper.jar -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' > ' + logFile, function (error, stdout, stderr) {
          //console.log(stdout);

          let readStream = fs.createReadStream(outputFile);
          readStream.pipe(res);
        });
      });
    });
  };

  //console.log(JSON.parse(req.body.sources));

  saveSources(JSON.parse(req.body.sources), prefix, callback);
});

router.post('/graphml2rml', function (req, res) {
  let ms = new Date().getTime();
  let graphML = tempDir + path.sep + "graphML_" + ms + ".xml";
  let originalMappingFile = dir + path.sep + "GraphML_Mapping.rml.ttl";
  let mappingFile = tempDir + path.sep + "GraphML_Mapping_" + ms + ".rml.ttl";
  let logFile = tempDir + path.sep + "log_" + ms + ".log";

  let child = exec('cat ' + originalMappingFile, function (error, stdout, stderr) {
    let updated = setSourceGraphmlFile(stdout, graphML);

    fs.writeFile(mappingFile, updated, function (err) {
      //console.log(err);

      let child = exec('echo \'' + req.body.graphml + '\' > ' + graphML, function (error, stdout, stderr) {
        let format = "turtle";
        let outputFile = tempDir + path.sep + "graphml2rml-result_" + ms + ".rml.ttl";

        //console.log('/home/pheyvaer/Developer/RML-Mapper/bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' -tm TriplesMapGenerator_Mapping');

        let child = exec('cd ' + rmwd + '; java -jar RML-Mapper.jar -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' -tm TriplesMapGenerator_Source_Mapping,MetadataGenerator_Mapping,FunctionTermMapGenerator_Mapping -b http://rml.io/rmleditor/graphml2rml# > ' + logFile, function (error, stdout, stderr) {
          console.log(stdout);
          console.log(stderr);

          let readStream = fs.createReadStream(outputFile);
          readStream.pipe(res);
        });
      });
    })
  });
});

router.post('/rml2graphml', function (req, res) {
  let parser = N3.Parser({format: 'Turtle'});
  let store = N3.Store();

  parser.parse(req.body.rml,
    function (error, triple, prefixes) {
      if (error) {
        console.error(error);
        res.status(400).send(error);
      } else if (triple) {
        store.addTriple(triple.subject, triple.predicate, triple.object);
      } else {
        //Adding Subjects
        let xw = new XMLWriter(true);
        rml2graphml(store, xw);

        res.send(xw.toString());
      }
    });
});

router.post('/remoteSourceData', function (req, res) {
  let ms = new Date().getTime();
  let originalRML = tempDir + path.sep + "remoteData_" + ms + ".rml.ttl";
  let outputFile = tempDir + path.sep + "source_" + ms + "." + req.body.format;
  let sourceID = req.body.sourceID;

  fs.writeFile(originalRML, req.body.rml, function (err) {
    if (err) {
      return console.log(err);
    }

    exec('cd ' + rmwd + '; java -jar RML-DataRetrievalHandler-2.0-SNAPSHOT.jar -m ' + originalRML + ' -o ' + outputFile + ' -f ' + req.body.format, function (error, stdout, stderr) {
      if (stderr.indexOf('ERROR') === -1) {
        let readStream = fs.createReadStream(outputFile);
        readStream.pipe(res);
      } else {
        console.log(stderr);
        res.status(400).send(stderr);
      }
    });
  });
});

router.get('/downloadfile', function (req, res) {
  let uri = req.query.uri;

  request(uri, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      res.send(body);
    } else {
      res.status(400).send({error: error});
    }
  });
});

router.post('/api/v1/validate', function (req, res) {
  let options = {
    method: 'post',
    form: req.body,
    url: config.urls.validator + '/api/v1/validate'
  };

  request(options, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      res.send(body);
    } else {
      res.status(400).send({error: error});
    }
  });
});

router.post('/analyse', function (req, res) {
  console.log(req.body.data.replace(/(\r\n|\n|\r)/gm, "").replace(/>\s*/g, '>').replace(/\s*</g, '<'));
  let da = new DataAnalysis.xml.SDaro(req.body.data.replace(/(\r\n|\n|\r)/gm, "").replace(/>\s*/g, '>').replace(/\s*</g, '<'));
  let output = da.analyze('/', {pruning: true, logLevel: 'info', multiLevel: true, features: 'structure'});
  console.log(output);

  res.send(output);
});

router.post('/example2graphml', function (req, res) {
  console.log(req.body.dataSources);
  example2rml(req.body.triples, req.body.dataSources)
    .then(function (rml) {
      console.log(rml);
      let xw = new XMLWriter(true);
      let store = N3.Store();
      store.addTriples(rml);

      rml2graphml(store, xw);

      res.send(xw.toString());
    }).catch(function (error) {
    console.log(error.name);
    res.status(400).send(error);
  });
});

router.post('/example2rml', function (req, res) {
  example2rml(req.body.triples, req.body.dataSources)
    .then(function (rml) {
      res.send(rml);
    }).catch(function (error) {
    console.log(error.name);
    res.status(400).send(error);
  });
});

module.exports = router;
