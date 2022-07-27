/**
 * author: Pieter Heyvaert (pieter.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const download = require('../lib/download-rmlmapper');

let version = null;
if (process.argv[2]) {
  version = process.argv[2];
}

download(version)
  .then(({ version, fullPath }) => {
    console.log(`The RMLMapper is available at ${fullPath}.`);
  })
  .catch(e => {
    console.error(e);
  });
