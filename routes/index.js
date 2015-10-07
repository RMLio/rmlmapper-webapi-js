/*
CHANGE TO YOUR OWN RML-MAPPER DIRECTORY
*/
var rmwd = "/home/pheyvaer/Developer/RML-Mapper";

var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;
var path = require('path');

var dir = __dirname.replace("/routes", "");

router.post('/process', function(req, res) {
	var mappingFile = dir + path.sep + "mapdoc.rml";

	var child = exec('echo \'' + req.body.rml + '\' > ' + mappingFile, function(error, stdout, stderr) {
	  var format = "rdfjson";
	  var outputFile = dir + path.sep + "result.ttl";

		var child = exec('cd ' + rmwd + '; bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile, function(error, stdout, stderr) {
			console.log(stdout);

	    var child = exec('cat ' + outputFile, function(error, stdout, stderr) {
	    	res.send(stdout);
	  	});
	  });
  });
});

router.post('/graphml2rml', function(req, res) {
	var graphML = dir + path.sep + "graphML.xml";

	var child = exec('echo \'' + req.body.graphml + '\' > ' + graphML, function(error, stdout, stderr) {
	  var mappingFile = dir + path.sep + "GraphML_Mapping.rml.ttl";
	  var format = "turtle";
	  var outputFile = dir + path.sep + "graphml2rml-result.rml";

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
