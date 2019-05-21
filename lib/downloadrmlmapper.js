/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const https = require('follow-redirects').https;
const fs = require('fs');
const logger = require('./logger')();

const RMLMAPPER_LATEST = 'https://api.github.com/repos/rmlio/rmlmapper-java/releases/latest';

function download(toFilePath) {
  return new Promise((resolve, reject) => {
    https.get(RMLMAPPER_LATEST, {
      headers: {'User-Agent': 'RMLMapper downloader'}
    }, (res) => {
      let json = '';

      res.on('data', (d) => {
        json += d;
      });

      res.on('end', () => {
        json = JSON.parse(json);

        let i = 0;

        while (i < json.assets.length && json.assets[i].browser_download_url.indexOf('.jar') === -1) {
          i++
        }

        if (i < json.assets.length) {
          logger.info(`Downloading the RMLMapper ${json.tag_name}...`);

          const file = fs.createWriteStream(toFilePath);
          https.get(json.assets[i].browser_download_url, function (response) {
            response.pipe(file);

            response.on('end', () => {
              resolve(json.tag_name);
            });
          });
        } else {
          reject('No jar was found for the latest release. Please contact the developers.');
        }
      });

    }).on('error', (e) => {
      reject(e);
    });
  });
}

module.exports = download;
