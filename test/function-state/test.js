const assert = require('assert');
const http = require('http');
const fs = require('fs-extra');
const config = require('./config');
const App = require('../../app');

const PORT = 4000;

describe('Function state', function() {

    this.timeout(5000);
    let server;

    before(() => {
        const app = App(config);
        app.set('port', PORT);
        server = http.createServer(app);
        server.listen(PORT);
    });

    it('post /execute', (done) => {
        const req = http.request('http://localhost:' + PORT + '/execute', {
            method: 'POST',
            "headers": {
                "Content-Type": "application/json"
            }
        }, (res) => {
            let json = '';
            const {statusCode} = res;

            //assert.strictEqual(statusCode, 200);

            res.on("data", function (chunk) {
                json += chunk;
            });

            res.on("end", function () {
                assert.deepStrictEqual(JSON.parse(json), require('./output-post-execute.json'));
                // check if custom state dir exists
                assert.ok(fs.exists(config.stateFolder));
                done();
            });
        }).on('error', (e) => {
            console.error(`Got error: ${e.message}`);
            throw e;
        });

        req.write(JSON.stringify({
            rml: '@prefix rr: <http://www.w3.org/ns/r2rml#> .\n' +
                '@prefix rml: <http://semweb.mmlab.be/ns/rml#> .\n' +
                '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n' +
                '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n' +
                '@prefix ql: <http://semweb.mmlab.be/ns/ql#> .\n' +
                '@prefix map: <http://mapping.example.com/> .\n' +
                '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n' +
                '@prefix sd: <http://www.w3.org/ns/sparql-service-description#> .\n' +
                '@prefix ex: <http://example.org/> .\n' +
                '@prefix idlab-fn: <http://example.com/idlab/function/> .\n' +
                '@prefix fnml: <http://semweb.mmlab.be/ns/fnml#> .\n' +
                '@prefix fno: <https://w3id.org/function/ontology#> .\n' +
                '@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n' +
                '\n' +
                '@base <http://example.com/base/> .\n' +
                '\n' +
                '<TriplesMap1>\n' +
                '  a rr:TriplesMap;\n' +
                '\n' +
                '  rml:logicalSource [\n' +
                '    rml:source "student.csv";\n' +
                '    rml:referenceFormulation ql:CSV\n' +
                '  ];\n' +
                '\n' +
                '  rr:subjectMap [\n' +
                '    fnml:functionValue [\n' +
                '      rr:predicateObjectMap [\n' +
                '        rr:predicate fno:executes ;\n' +
                '        rr:objectMap [ rr:constant idlab-fn:generateUniqueIRI ] ] ;\n' +
                '      rr:predicateObjectMap [\n' +
                '        rr:predicate idlab-fn:iri ;\n' +
                '        rr:objectMap [ rr:template "http://example.org/{Id}" ;\n' +
                '                       rr:termType rr:IRI ] ] ;\n' +
                '      rr:predicateObjectMap [\n' +
                '         rr:predicate idlab-fn:watchedProperty ;\n' +
                '         rr:objectMap [ rr:constant "Id={Id}&Name={Name}" ] ]\n' +
                '    ]\n' +
                '  ];\n' +
                '\n' +
                '  rr:predicateObjectMap [\n' +
                '    rr:predicate foaf:name;\n' +
                '    rr:objectMap [\n' +
                '      rml:reference "Name"\n' +
                '    ]\n' +
                '  ].',
            sources: {'student.csv': 'Id,Name\n' +
                                      '1,Venus\n'}
        }));
        req.end();
    });

    after((done) => {
        server.close();
        fs.remove(config.tempFolder);
        fs.remove(config.stateFolder, () => {
            done();
        });
    });

});