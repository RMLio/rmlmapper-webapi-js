/**
 * author: Pieter Heyvaert (pieter.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const download = require('@rmlio/fetch-rmlmapper-java');
const path = require('path');
const fs = require('fs');

const DEFAULT_BASE_PATH = path.resolve(__dirname, '..');

const DEFAULT_RMLMAPPER_PATH = path.resolve(DEFAULT_BASE_PATH, 'rmlmapper.jar');
const DEFAULT_RMLMAPPER_VERSION_PATH = path.resolve(DEFAULT_BASE_PATH, 'rmlmapper-version.txt');

async function downloadWrapper(version = null, checkAlreadyDownloaded = false) {
  if (checkAlreadyDownloaded && fs.existsSync(DEFAULT_RMLMAPPER_PATH)) {
    version = fs.readFileSync(DEFAULT_RMLMAPPER_VERSION_PATH, 'utf-8').replace('\n', '');
    return {
      version,
      fullPath: DEFAULT_RMLMAPPER_PATH,
      cache: true,
    }
  }

  const result = await download(null, version, DEFAULT_BASE_PATH);
  const writeVersion = version ? 'v' + version : result.tagName;
  fs.renameSync(result.filePath, DEFAULT_RMLMAPPER_PATH);
  fs.writeFileSync(DEFAULT_RMLMAPPER_VERSION_PATH, writeVersion, 'utf8')
  return {
    version: writeVersion,
    fullPath: DEFAULT_RMLMAPPER_PATH,
    cache: false
  }
}

module.exports = downloadWrapper;
