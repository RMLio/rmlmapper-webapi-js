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

  constLatestTagNameOrVersion = await download(DEFAULT_BASE_PATH, version);
  // TODO tagName either has starting `v` when using latest or not when using specific function, this will change with the next update of fetch-rmlmapper-java
  const writeVersion = version ? 'v' + version : LatestTagNameOrVersion;
  // TODO filename is currently hardcoded in this version of fetch-rmlmapper-java, this will change with the next update
  const filename = path.resolve(DEFAULT_BASE_PATH, `rmlmapper-${writeVersion.slice(1)}.jar`);
  fs.renameSync(filename, DEFAULT_RMLMAPPER_PATH);
  fs.writeFileSync(DEFAULT_RMLMAPPER_VERSION_PATH, writeVersion, 'utf8')
  return {
    version: writeVersion,
    fullPath: DEFAULT_RMLMAPPER_PATH,
    cache: false
  }
}

module.exports = downloadWrapper;
