const config = require('../config.json');
const pkg = require('../package');
const rmlmapperPath = config.paths.rmlmapper;

const express = require('express');
const router = express.Router();
const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const request = require('request');
const N3 = require('n3');
const DataAnalysis = require("data-analysis");
const example2rml = require('example2rml');
const rml2graphml = require('RML2GraphML');
const XMLWriter = require('xml-writer');

const dir = __dirname.replace("/routes", "");
const tempDir = dir + path.sep + "tmp";
const sourceFilePrefix = "data-";

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
    if (typeof sources[names[index]] === 'string') {
      fs.writeFile(prefix + names[index], sources[names[index]], (err) => {
        if (err) {
          throw err;
        }

        done();
      });
    } else {
      callback(new Error(`The source with name "${names[index]}" is not string.`));
    }
  } else {
    done();
  }
}

function saveSources(sources, prefix, callback) {
  let names = [];

  for (let name in sources) {
    names.push(name);
  }

  writeSource(names, 0, sources, prefix, callback);
}

function setSourceGraphmlFile(original, path) {
  const regex = /rml:source .+;/g;
  return original.replace(regex, 'rml:source "' + path + '" ;');
}

function setSourcesMappingFile(rml, prefix, callback) {
  const parser = N3.Parser();
  const writer = N3.Writer();

  parser.parse(rml, function (error, triple, prefixes) {
    if (triple) {
      if (triple.predicate === 'http://semweb.mmlab.be/ns/rml#source' && N3.Util.isLiteral(triple.object)) {
        triple.object = N3.Util.createLiteral(prefix + N3.Util.getLiteralValue(triple.object));
      }

      writer.addTriple(triple.subject, triple.predicate, triple.object);
    } else {
      writer.end(function (error, result) {
        if (error) {
          console.log(error);
        }

        callback(result);
      });
    }
  })
}

router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>RMLMapper Web API v${pkg.version}</title>
  </head>
  <body>
    <h3>RMLMapper Web API</h3>
    <ul>
      <li>API version: ${pkg.version}</li>
      <li>RMLMapper version: ${config.versions.rmlmapper}</li>
    </ul>
    
    <div>
        <h4>Usage</h4>
        
        <p>
            <ul>
                <li>Request: HTTP POST</li>
                <li>Path: <code>/process</code></li>
                <li>Content-Type: application/json</li>
                <li>Body (raw):
                    <ul>
                        <li><code>rml</code> (required): RML rules (string, Turtle format)</li>
                        <li><code>sources</code> (optional): key-value pairs where the key is the name of the source used in the rules and the value the string representation of that source</li>
                        <li><code>generateMetadata</code> (optional, default is <code>false</code>): if set to <code>true</code> the metadata of the process is generated and returned</li>
                    </ul>
                </li>
                <li>Example:
                    <pre>
curl -X POST \\
  ${config.urls["web-api"]}/process \\
  -H 'Content-Type: application/json' \\
  -d '{
  "rml":"@prefix rr: &lt;http://www.w3.org/ns/r2rml#&gt;. @prefix rml: &lt;http://semweb.mmlab.be/ns/rml#&gt;. @prefix rdf: &lt;http://www.w3.org/1999/02/22-rdf-syntax-ns&gt;. @prefix rdfs: &lt;http://www.w3.org/2000/01/rdf-schema#&gt;. @prefix ql: &lt;http://semweb.mmlab.be/ns/ql#&gt;. @prefix map: &lt;http://mapping.example.com/&gt;.  map:map_person_0 rml:logicalSource map:source_0;     a rr:TriplesMap;     rdfs:label \\"person\\";     rr:subjectMap map:s_0;     rr:predicateObjectMap map:pom_0, map:pom_1. map:om_0 a rr:ObjectMap;     rr:constant \\"http://xmlns.com/foaf/0.1/Person\\";     rr:termType rr:IRI. map:om_1 a rr:ObjectMap;     rml:reference \\"firstname\\";     rr:termType rr:Literal. map:pm_0 a rr:PredicateMap;     rr:constant rdf:type. map:pm_1 a rr:PredicateMap;     rr:constant &lt;http://example.com/name>. map:pom_0 a rr:PredicateObjectMap;     rr:predicateMap map:pm_0;     rr:objectMap map:om_0. map:pom_1 a rr:PredicateObjectMap;     rr:predicateMap map:pm_1;     rr:objectMap map:om_1. map:s_0 a rr:SubjectMap;     rr:template \\"http://example.com/{firstname}\\". map:source_0 a rml:LogicalSource;     rml:source \\"data.json\\";     rml:iterator \\"$.persons[*]\\";     rml:referenceFormulation ql:JSONPath. ",
  "sources": {
  	"data.json": "{\\"persons\\": [{\\"firstname\\": \\"John\\", \\"lastname\\": \\"Doe\\"},{\\"firstname\\": \\"Jane\\",\\"lastname\\": \\"Smith\\"},{ \\"firstname\\": \\"Sarah\\", \\"lastname\\": \\"Bladinck\\"}] }"
  }
}'
</pre>
                </li>
            </ul>
        </p>
    </div>
  </body>
</html>`);
});

router.post('/process', function (req, res) {
  const ms = new Date().getTime();
  const processDir = tempDir + path.sep + ms;

  if (!req.body.rml) {
    res.status(400).send(`The parameter "rml" is required.`);
  } else {

    fs.mkdir(processDir, () => {
      const logFile = processDir + path.sep + 'rmlmapper.log';
      const sourceDirPrefix = processDir + path.sep + sourceFilePrefix;

      const callback = function (error) {
        if (error) {
          res.status(400).send(error.message);
        } else {
          const mappingFile = processDir + path.sep + 'mapping.rml.ttl';

          setSourcesMappingFile(req.body.rml, sourceDirPrefix, function (rml) {
            fs.writeFile(mappingFile, rml, function (error) {
              const outputFile = processDir + path.sep + "output.nq";
              const metadatafile = processDir + path.sep + "metadata.nq";
              const generateMetatdata = req.body.generateMetadata;

              let execCommand = `java -jar ${rmlmapperPath} -m ${mappingFile} -o ${outputFile}`;

              if (generateMetatdata) {
                execCommand += ` -l triple -e ${metadatafile}`;
              }

              execCommand += ` &> ${logFile}`;

              exec(execCommand, function (error, stdout, stderr) {

                if (stderr) {
                  console.error(stderr);
                }

                fs.readFile(outputFile, 'utf8', (outputErr, output) => {
                  if (outputErr) {
                    console.error(`Error while reading output file '${outputFile}'`);
                    res.status('500');
                    res.send();
                  } else {
                    if (generateMetatdata) {
                      fs.readFile(metadatafile, 'utf8', (metadataErr, metadata) => {
                        if (metadataErr) {
                          console.error(`Error while reading metadata file '${outputFile}'`);
                          res.status('500');
                          res.send();
                        } else {
                          res.send({output, metadata});
                        }
                      });
                    } else {
                      res.send({output});
                    }
                  }
                });
              });
            });
          });
        }
      };

      if (req.body.sources) {
        saveSources(req.body.sources, sourceDirPrefix, callback);
      } else {
        callback();
      }
    });
  }
});

router.post('/graphml2rml', function (req, res) {
  const ms = new Date().getTime();
  const processDir = tempDir + path.sep + ms;

  fs.mkdir(processDir, () => {
    const graphML = processDir + path.sep + "graphml.xml";
    const originalMappingFile = dir + path.sep + "GraphML_Mapping.rml.ttl";
    const mappingFile = processDir + path.sep + "graphml-mapping.rml.ttl";
    const logFile = processDir + path.sep + "rmlmapper.log";

    exec('cat ' + originalMappingFile, function (error, stdout, stderr) {
      let updated = setSourceGraphmlFile(stdout, graphML);

      fs.writeFile(mappingFile, updated, function (err) {
        //console.log(err);

        exec('echo \'' + req.body.graphml + '\' > ' + graphML, function (error, stdout, stderr) {
          const format = "turtle";
          const outputFile = processDir + path.sep + "result" + ms + ".rml.ttl";

          //console.log('/home/pheyvaer/Developer/RML-Mapper/bin/RML-Mapper -m ' + mappingFile + ' -f ' + format + ' -o ' + outputFile + ' -tm TriplesMapGenerator_Mapping');

          exec(`java -jar ${rmlmapperPath} -m ${mappingFile} -f ${format} -o ${outputFile} -t http://rml.io/rmleditor/graphml2rml#TriplesMapGenerator_Source_Mapping,http://rml.io/rmleditor/graphml2rml#MetadataGenerator_Mapping,http://rml.io/rmleditor/graphml2rml#FunctionTermMapGenerator_Mapping &> ${logFile}`, function (error, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            console.log("GRAPH2RML");

            try {
              const readStream = fs.createReadStream(outputFile);
              readStream.pipe(res);
            } catch (e) {
              console.error(e);
              res.status(500);
              res.send();
            }
          });
        });
      })
    });
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

    exec('cd ' + rmlmapperPath + '; java -jar RML-DataRetrievalHandler-2.0-SNAPSHOT.jar -m ' + originalRML + ' -o ' + outputFile + ' -f ' + req.body.format, function (error, stdout, stderr) {
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
