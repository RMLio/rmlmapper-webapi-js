/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const config = require('./config');
const assert = require('assert');
const App = require('../app');
const http = require('http');
const fs = require('fs-extra');

const PORT = 4001;
let server;

describe('Test app.js', function() {
  this.timeout(5000);

  it('without existing temp folder', (done) => {
    const app = App(config);
    app.set('port', PORT);
    server = http.createServer(app);
    server.listen(PORT);
    server.on('listening', () => {
      fs.pathExists(config.tempFolder, (err, exists) => {
        assert.strictEqual(exists, true);
        done();
      });
    });
  });

  after((done) => {
    server.close();
    fs.remove(config.tempFolder, () => {
      done();
    });
  });
});
