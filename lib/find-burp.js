const path = require('path');
const fs = require('fs');

const DEFAULT_BASE_PATH = path.resolve(__dirname, '..');

const DEFAULT_BURP_PATH = path.resolve(DEFAULT_BASE_PATH, 'burp.jar');
const DEFAULT_BURP_VERSION_PATH = path.resolve(DEFAULT_BASE_PATH, 'burp-version.txt');

function findBurp() {
  if (fs.existsSync(DEFAULT_BURP_PATH)) {
    version = fs.readFileSync(DEFAULT_BURP_VERSION_PATH, 'utf-8').replace('\n', '');
    return {
      version,
      fullPath: DEFAULT_BURP_PATH
    }
  }

  throw new Error('Sorry, consult the README');
}

module.exports = findBurp;
