const config = require('../config.json');
const pkg = require('../package');
const rmlmapperPath = config.paths.rmlmapper;

const express = require('express');
const router = express.Router();
const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs-extra');
const N3 = require('n3');

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
  res.render('index', {
    apiVersion: pkg.version,
    rmlmapperVersion: config.versions.rmlmapper,
    url: config.urls['web-api']
  })
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

                  if (config.removeTempFolders) {
                    fs.remove(processDir, err => {
                      if (err) {
                        console.error(`Unable to remove temp folder "${processDir}.`);
                        console.error(err);
                      }
                    });
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

module.exports = router;
