/*
 CHANGE TO YOUR OWN RML-MAPPER DIRECTORY
 */
var rmwd = "/home/pieter/Developer/RML-Mapper";

var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var http = require('http');

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
  };

  if (sources[names[index]]) {
    //console.log(sources[names[index]].replace('\'', "'\"'\"''"));
    console.log('echo \'' + sources[names[index]].replace(/\'/g, "'\"'\"'") + '\' > ' + tempDir + path.sep + prefix + names[index] + '.csv');
    var child = exec('echo \'' + sources[names[index]].replace(/\'/g, "'\"'\"'") + '\' > ' + tempDir + path.sep + prefix + names[index] + '.csv', function (error, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      done();
    });
  } else {
    done();
  }
};

function saveSources(sources, prefix, callback) {
  var names = [];

  for (var name in sources) {
    names.push(name);
  }

  console.log(names);

  writeSource(names, 0, sources, prefix, callback);
};

function setSourcesMappingFile(rml, prefix) {
  //console.log(rml);
  var regex = /(<http:\/\/semweb.mmlab.be\/ns\/rml#source>) "(.*)" ([;\.])/g;
  newRML = rml.replace(regex, '$1 "' + tempDir + path.sep + prefix + '$2\.csv" $3');
  console.log(newRML);
  return newRML;
};

function setSourceGraphmlFile(original, path) {
  var regex = /rml:source .+;/g;
  updated = original.replace(regex, 'rml:source "' + path + '" ;');
  //console.log(updated);
  return updated;
};

router.post('/process', function (req, res) {
  var ms = new Date().getTime();
  var prefix = sourceFilePrefix + ms + "_";
  var logFile = tempDir + path.sep + "log_" + ms + ".log";

  var callback = function () {
    var mappingFile = tempDir + path.sep + "mapdoc_" + ms + ".rml";

    var rml = setSourcesMappingFile(req.body.rml, prefix);

    var child = exec('echo \'' + rml + '\' > ' + mappingFile, function (error, stdout, stderr) {
      var format = "rdfjson";
      var outputFile = tempDir + path.sep + "result_" + ms + ".ttl";

      var child = exec('cd ' + rmwd + '; bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' > ' + logFile, function (error, stdout, stderr) {
        console.log(stdout);

        var child = exec('cat ' + outputFile, function (error, stdout, stderr) {
          res.send(stdout);
        });
      });
    });
  };

  console.log(JSON.parse(req.body.sources));

  saveSources(JSON.parse(req.body.sources), prefix, callback);
});

router.post('/graphml2rml', function (req, res) {
  var ms = new Date().getTime();
  var graphML = tempDir + path.sep + "graphML_" + ms + ".xml";
  var originalMappingFile = dir + path.sep + "GraphML_Mapping.rml.ttl";
  var mappingFile = tempDir + path.sep + "GraphML_Mapping_" + ms + ".rml.ttl";
  var logFile = tempDir + path.sep + "log_" + ms + ".log";

  var child = exec('cat ' + originalMappingFile, function (error, stdout, stderr) {
    updated = setSourceGraphmlFile(stdout, graphML);

    fs.writeFile(mappingFile, updated, function (err) {
      //console.log(err);

      var child = exec('echo \'' + req.body.graphml + '\' > ' + graphML, function (error, stdout, stderr) {
        var format = "turtle";
        var outputFile = tempDir + path.sep + "graphml2rml-result_" + ms + ".rml.ttl";

        //console.log('/home/pheyvaer/Developer/RML-Mapper/bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' -tm TriplesMapGenerator_Mapping');

        var child = exec('cd ' + rmwd + '; bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' -tm TriplesMapGenerator_Source_Mapping > ' + logFile, function (error, stdout, stderr) {
          console.log(stdout);

          var child = exec('cat ' + outputFile, function (error, stdout, stderr) {
            res.send(stdout);
          });
        });
      });
    })
  });
});

router.get('/downloadfile', function (req, res){
  var uri = req.query.uri;

  var csvData = '';
  var request = http.get(uri, function(response) {
    response.on('data', function(chunk) {
      csvData += chunk;
    });
    response.on('end', function() {
      //console.log(csvData);
      res.send(csvData);
    });
  });
});

module.exports = router;
