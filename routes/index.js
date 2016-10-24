var config = require('../config.json');
var rmwd = config.paths.rmlmapper;
var grwd = config.paths.rml2graphml;

var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var http = require('http');
var request = require('request');
var N3 = require('n3');

var dir = __dirname.replace("/routes", "");
var tempDir = dir + path.sep + "tmp";
var sourceFilePrefix = "source_";

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
  var names = [];

  for (var name in sources) {
    names.push(name);
  }

  //console.log(names);

  writeSource(names, 0, sources, prefix, callback);
}

function setSourcesMappingFile(rml, prefix, callback) {
  var parser = N3.Parser();
  var writer = N3.Writer();

  parser.parse(rml, function(error, triple, prefixes){
    if (triple) {
      if (triple.predicate == 'http://semweb.mmlab.be/ns/rml#source' && N3.Util.isLiteral(triple.object)) {
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
  var regex = /rml:source .+;/g;
  var updated = original.replace(regex, 'rml:source "' + path + '" ;');
  //console.log(updated);
  return updated;
}

router.post('/process', function (req, res) {
  var ms = new Date().getTime();
  var prefix = sourceFilePrefix + ms + "_";
  var logFile = tempDir + path.sep + "log_" + ms + ".log";

  //console.log(JSON.parse(req.body.sources));

  var callback = function () {
    var mappingFile = tempDir + path.sep + "mapdoc_" + ms + ".rml";

    setSourcesMappingFile(req.body.rml, prefix, function(rml){
      fs.writeFile(mappingFile, rml, function(error) {
        var format = "rdfjson";
        var outputFile = tempDir + path.sep + "result_" + ms + ".ttl";

        var child = exec('cd ' + rmwd + '; java -jar RML-Mapper.jar -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' > ' + logFile, function (error, stdout, stderr) {
          //console.log(stdout);

          var readStream = fs.createReadStream(outputFile);
          readStream.pipe(res);
        });
      });
    });
  };

  //console.log(JSON.parse(req.body.sources));

  saveSources(JSON.parse(req.body.sources), prefix, callback);
});

router.post('/graphml2rml', function (req, res) {
  var ms = new Date().getTime();
  var graphML = tempDir + path.sep + "graphML_" + ms + ".xml";
  var originalMappingFile = dir + path.sep + "GraphML_Mapping.rml.ttl";
  var mappingFile = tempDir + path.sep + "GraphML_Mapping_" + ms + ".rml.ttl";
  var logFile = tempDir + path.sep + "log_" + ms + ".log";

  var child = exec('cat ' + originalMappingFile, function (error, stdout, stderr) {
    var updated = setSourceGraphmlFile(stdout, graphML);

    fs.writeFile(mappingFile, updated, function (err) {
      //console.log(err);

      var child = exec('echo \'' + req.body.graphml + '\' > ' + graphML, function (error, stdout, stderr) {
        var format = "turtle";
        var outputFile = tempDir + path.sep + "graphml2rml-result_" + ms + ".rml.ttl";

        //console.log('/home/pheyvaer/Developer/RML-Mapper/bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' -tm TriplesMapGenerator_Mapping');

        var child = exec('cd ' + rmwd + '; java -jar RML-Mapper.jar -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' -tm TriplesMapGenerator_Source_Mapping,MetadataGenerator_Mapping -b http://rml.io/rmleditor/graphml2rml# > ' + logFile, function (error, stdout, stderr) {
          console.log(stdout);

          var readStream = fs.createReadStream(outputFile);
          readStream.pipe(res);
        });
      });
    })
  });
});

router.post('/rml2graphml', function(req, res) {
  var ms = new Date().getTime();
  var originalRML = tempDir + path.sep + "originalRML_" + ms + ".rml.ttl";
  var graphml = tempDir + path.sep + "graphMLFromRML_" + ms + ".xml";

  fs.writeFile(originalRML, req.body.rml, function(err) {
    if(err) {
      return console.log(err);
    }

    exec('cd ' + grwd + '; node RML2GraphML.js ' + originalRML + ' ' + graphml, function (error, stdout, stderr) {

      if (!stderr) {
        var readStream = fs.createReadStream(graphml);
        readStream.pipe(res);
      } else {
        res.status(400).send(stderr);
      }
    });
  });
});

router.post('/remoteSourceData', function(req, res) {
  var ms = new Date().getTime();
  var originalRML = tempDir + path.sep + "remoteData_" + ms + ".rml.ttl";
  var outputFile = tempDir + path.sep + "source_" + ms + "." + req.body.format;
  var sourceID = req.body.sourceID;

  fs.writeFile(originalRML, req.body.rml, function(err) {
    if(err) {
      return console.log(err);
    }

    exec('cd ' + rmwd + '; java -jar RML-DataRetrievalHandler-2.0-SNAPSHOT.jar -m ' + originalRML + ' -o ' + outputFile + ' -f ' + req.body.format, function (error, stdout, stderr) {
      if (stderr.indexOf('ERROR') == -1) {
        var readStream = fs.createReadStream(outputFile);
        readStream.pipe(res);
      } else {
        console.log(stderr);
        res.status(400).send(stderr);
      }
    });
  });
});

router.get('/downloadfile', function (req, res){
  var uri = req.query.uri;

  request(uri, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.send(body);
    } else {
      res.status(400).send({error: error});
    }
  });
});

router.post('/api/v1/validate', function (req, res){
  var options = {
    method: 'post',
    form: req.body,
    url: config.urls.validator + '/api/v1/validate'
  };

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.send(body);
    } else {
      res.status(400).send({error: error});
    }
  });
});

module.exports = router;
