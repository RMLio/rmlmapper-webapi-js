/*
CHANGE TO YOUR OWN RML-MAPPER DIRECTORY
*/
var rmwd = "/home/pieter/Developer/RML-Mapper";

var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');

var dir = __dirname.replace("/routes", "");
var tempDir = dir + path.sep + "tmp";
var sourceFilePrefix = "source_";

//check if temp directory exists
if (!fs.existsSync(tempDir)){
    fs.mkdirSync(tempDir);
}

function writeSource(names, index, sources, callback) {
  var child = exec('echo \'' + sources[names[index]] + '\' > ' + tempDir + path.sep + sourceFilePrefix + names[index] + '.csv', function(error, stdout, stderr) {
    if (index < names.length) {
      writeSource(names, index + 1, sources, callback);
    } else {
      callback();
    }
  });
};

function saveSources(sources, callback) {
  var names = [];

  for(var name in sources) {
    names.push(name);
  }

  console.log(names);

  writeSource(names, 0, sources, callback);
};

function setSourcesMappingFile(rml) {
  console.log(rml);
  var regex = /(<http:\/\/semweb.mmlab.be\/ns\/rml#source>) "(.*)"/;
  newRML = rml.replace(regex, '$1 "' + tempDir + path.sep + sourceFilePrefix + '$2\.csv"');
  console.log(newRML);
  return newRML;
};

router.post('/process', function(req, res) {
  var callback = function() {
    var ms = new Date().getTime();
    var mappingFile = tempDir + path.sep + "mapdoc_" + ms + ".rml";

    var rml = setSourcesMappingFile(req.body.rml);

    var child = exec('echo \'' + rml + '\' > ' + mappingFile, function(error, stdout, stderr) {
      var format = "rdfjson";
      var outputFile = tempDir + path.sep + "result_" + ms + ".ttl";

      var child = exec('cd ' + rmwd + '; bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile, function(error, stdout, stderr) {
        console.log(stdout);

        var child = exec('cat ' + outputFile, function(error, stdout, stderr) {
          res.send(stdout);
        });
      });
    });
  };

  console.log(JSON.parse(req.body.sources));

  saveSources(JSON.parse(req.body.sources), callback);
});

router.post('/graphml2rml', function(req, res) {
  var ms = new Date().getTime();
	var graphML = tempDir + path.sep + "graphML_" + ms + ".xml";

	var child = exec('echo \'' + req.body.graphml + '\' > ' + graphML, function(error, stdout, stderr) {
	  var mappingFile = dir + path.sep + "GraphML_Mapping.rml.ttl";
	  var format = "turtle";
	  var outputFile = tempDir + path.sep + "graphml2rml-result_" + ms + ".rml";

	  //console.log('/home/pheyvaer/Developer/RML-Mapper/bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' -tm TriplesMapGenerator_Mapping');

		var child = exec('cd ' + rmwd + '; bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' -tm TriplesMapGenerator_Mapping', function(error, stdout, stderr) {
			console.log(stdout);

	    var child = exec('cat ' + outputFile, function(error, stdout, stderr) {
	    	res.send(stdout);
	  	});
	  });
  });

});

module.exports = router;
