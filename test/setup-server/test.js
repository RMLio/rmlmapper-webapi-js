/**
 * author: Pieter Heyvaert (pieter.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const config = require('./config');
const assert = require('assert');
const App = require('../..');
const http = require('http');
const fs = require('fs-extra');
const path = require('path');

let server;

describe('Setup server', function() {
  this.timeout(5000);

  it('with non-existing temp folder', (done) => {
    const port = 4001;
    const app = App(config);
    app.set('port', port);
    server = http.createServer(app);
    server.listen(port);
    server.on('listening', () => {
      fs.pathExists(config.tempFolder, (err, exists) => {
        assert.strictEqual(exists, true);
        fs.removeSync(config.tempFolder);
        server.close();
        done();
      });
    });
  });

  it('with existing temp folder', (done) => {
    const port = 4002;
    const dir = __dirname + path.sep + 'aaa';
    fs.mkdirSync(dir);

    const myConfig = JSON.parse(JSON.stringify(config));
    myConfig.tempFolder = dir;

    const app = App(myConfig);
    app.set('port', port);
    server = http.createServer(app);
    server.listen(port);
    server.on('listening', () => {
      fs.pathExists(myConfig.tempFolder, (err, exists) => {
        assert.strictEqual(exists, true);
        fs.removeSync(dir);
        server.close();
        done();
      });
    });
  });

  it('custom base path', () => {
    const myConfig = JSON.parse(JSON.stringify(config));
    myConfig.basePath = '/apple';

    const app = App(myConfig);

    assert.strictEqual(app._basePath, '/apple');
  });

  it('add / to custom base path', () => {
    const myConfig = JSON.parse(JSON.stringify(config));
    myConfig.basePath = 'apple';

    const app = App(myConfig);

    assert.strictEqual(app._basePath, '/apple');
  });

  it('default base path', () => {
    const myConfig = JSON.parse(JSON.stringify(config));
    delete myConfig.basePath;

    const app = App(myConfig);

    assert.strictEqual(app._basePath, '/');
  });
});
