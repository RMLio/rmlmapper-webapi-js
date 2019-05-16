/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const assert = require('assert');
const App = require('../app');
const http = require('http');
const path = require('path');
const fs = require('fs-extra');

const PORT = 4001;
const tempDir = __dirname + path.sep + "tmp-test";
let server;

describe('Test app.js', function() {
  this.timeout(5000);

  it('without existing temp folder', (done) => {
    const app = App(null, tempDir);
    app.set('port', PORT);
    server = http.createServer(app);
    server.listen(PORT);
    server.on('listening', () => {
      fs.pathExists(tempDir, (err, exists) => {
        assert.strictEqual(exists, true);
        done();
      });
    });
  });

  after((done) => {
    server.close();
    fs.remove(tempDir, () => {
      done();
    });
  });
});
