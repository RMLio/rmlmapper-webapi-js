## Web API for the RMLMapper

![code coverage](https://img.shields.io/badge/coverage-100%25-success.svg)

### Requirements
- Node.js
- Java VM

### Usage
- Clone this repo.
- Go into folder of repo: `cd rmlmapper-webapi-js`.
- Install dependencies: `npm install`.
- Download the [RMLMapper](https://github.com/RMLio/rmlmapper-java): `npm run download:rmlmapper`.
- Rename `config_example.json` to `config.json` and update it (see below for [details](#configuration-file)). 
The file includes the path to the jar of the RMLMapper.
- Start the server via `npm start`.
- The server is available at `http://localhost:4000` (if port is unchanged).

### Configuration file
The configuration file is called `config.json` and contains the following settings:

- `paths.rmlmapper`: the path of the RMLMapper jar
- `versions.rmlmapper`: the version of the used RMLMapper. This is shown on the main page of the API.
- `urls.web-api`: the url of where the API will be available. This is shown on the main page of the API.
- `removeTempFolders`: if this is set true, temporary folders are removed once the execution of one call is done.

### How to make API calls

- Request: HTTP Post
- Path: /execute
- Content-Type: application/json
- Body (raw):
  - `rml` (required): RML rules (string, Turtle format
  - `sources` (optional): key-value pairs where the key is the name of the source used in the rules and the value the string representation of that source
  - `generateMetadata` (optional, default is `false`): if set to `true` the metadata of the process is generated and returned
                      

- Example:
```
curl -X POST \
  http://localhost:4000/execute \
  -H 'Content-Type: application/json' \
  -d '{
  "rml":"@prefix rr: <http://www.w3.org/ns/r2rml#>. @prefix rml: <http://semweb.mmlab.be/ns/rml#>. @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>. @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>. @prefix ql: <http://semweb.mmlab.be/ns/ql#>. @prefix map: <http://mapping.example.com/>.  map:map_person_0 rml:logicalSource map:source_0;     a rr:TriplesMap;     rdfs:label \"person\";     rr:subjectMap map:s_0;     rr:predicateObjectMap map:pom_0, map:pom_1. map:om_0 a rr:ObjectMap;     rr:constant \"http://xmlns.com/foaf/0.1/Person\";     rr:termType rr:IRI. map:om_1 a rr:ObjectMap;     rml:reference \"firstname\";     rr:termType rr:Literal. map:pm_0 a rr:PredicateMap;     rr:constant rdf:type. map:pm_1 a rr:PredicateMap;     rr:constant <http://example.com/name>. map:pom_0 a rr:PredicateObjectMap;     rr:predicateMap map:pm_0;     rr:objectMap map:om_0. map:pom_1 a rr:PredicateObjectMap;     rr:predicateMap map:pm_1;     rr:objectMap map:om_1. map:s_0 a rr:SubjectMap;     rr:template \"http://example.com/{firstname}\". map:source_0 a rml:LogicalSource;     rml:source \"data.json\";     rml:iterator \"$.persons[*]\";     rml:referenceFormulation ql:JSONPath. ",
  "sources": {
  	"data.json": "{\"persons\": [{\"firstname\": \"John\", \"lastname\": \"Doe\"},{\"firstname\": \"Jane\",\"lastname\": \"Smith\"},{ \"firstname\": \"Sarah\", \"lastname\": \"Bladinck\"}] }"
  }
}'
```

### Run tests

- The RMLMapper needs to be available in the root and called `rmlmapper.jar`.
This is the case if you executed `npm run download:rmlmapper`.
- Run the tests via `npm test`.
The test framework is [Mocha](https://mochajs.org/) and the code coverage is provided via [Istanbul](https://istanbul.js.org/)

### License

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/) and 
released under the [MIT license](http://opensource.org/licenses/MIT).
