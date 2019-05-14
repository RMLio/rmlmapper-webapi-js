/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const assert = require('assert');
const app = require('../app')();
const http = require('http');

const PORT = 4000;

describe('Test app.js', function() {
  let server;

  before(() => {
    app.set('port', PORT);
    server = http.createServer(app);
    server.listen(PORT);
  });

  it('get /', (done) => {
    http.get('http://localhost:' + PORT, (res) => {
      const { statusCode } = res;

      assert.strictEqual(statusCode, 200);
      done();
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
      throw e;
    });
  });

  it('post /execute', (done) => {
    const req = http.request('http://localhost:' + PORT + '/execute', {
      method: 'POST',
      "headers": {
        "Content-Type": "application/json"
      }
    }, (res) => {
      const chunks = [];
      const { statusCode } = res;

      assert.strictEqual(statusCode, 200);

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        const body = Buffer.concat(chunks);

        assert.deepStrictEqual(JSON.parse(body.toString()), require('./output-post-execute.json'));
        done();
      });
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
      throw e;
    });

    req.write(JSON.stringify({ rml: '@prefix rr: <http://www.w3.org/ns/r2rml#>. @prefix rml: <http://semweb.mmlab.be/ns/rml#>. @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>. @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>. @prefix ql: <http://semweb.mmlab.be/ns/ql#>. @prefix map: <http://mapping.example.com/>.  map:map_person_0 rml:logicalSource map:source_0;     a rr:TriplesMap;     rdfs:label "person";     rr:subjectMap map:s_0;     rr:predicateObjectMap map:pom_0, map:pom_1. map:om_0 a rr:ObjectMap;     rr:constant "http://xmlns.com/foaf/0.1/Person";     rr:termType rr:IRI. map:om_1 a rr:ObjectMap;     rml:reference "firstname";     rr:termType rr:Literal. map:pm_0 a rr:PredicateMap;     rr:constant rdf:type. map:pm_1 a rr:PredicateMap;     rr:constant <http://example.com/name>. map:pom_0 a rr:PredicateObjectMap;     rr:predicateMap map:pm_0;     rr:objectMap map:om_0. map:pom_1 a rr:PredicateObjectMap;     rr:predicateMap map:pm_1;     rr:objectMap map:om_1. map:s_0 a rr:SubjectMap;     rr:template "http://example.com/{firstname}". map:source_0 a rml:LogicalSource;     rml:source "data.json";     rml:iterator "$.persons[*]";     rml:referenceFormulation ql:JSONPath. ',
      sources: { 'data.json': '{     "persons": [         {             "firstname": "John",             "lastname": "Doe"         },         {             "firstname": "Jane",             "lastname": "Smith"         },         {             "firstname": "Sarah",             "lastname": "Bladinck"         }     ] }' } }));
    req.end();
  });

  it('post /execute without rml', (done) => {
    const req = http.request('http://localhost:' + PORT + '/execute', {
      method: 'POST',
      "headers": {
        "Content-Type": "application/json"
      }
    }, (res) => {
      const { statusCode } = res;

      assert.strictEqual(statusCode, 400);
      done();
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
      throw e;
    });

    req.write(JSON.stringify({}));
    req.end();
  });

  after(() => {
    server.close();
  });
});
