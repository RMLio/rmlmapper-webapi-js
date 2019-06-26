/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const download = require('./downloadrmlmapper');
const path = require('path');

const rmlmapperPath = path.resolve(process.cwd(), 'rmlmapper.jar');

download(rmlmapperPath)
  .then(() => {
    console.log(`The RMLMapper is available at ${rmlmapperPath}.`);
  })
  .catch(e => {
    console.error(e);
  });
