## Web API for the RMLMapper

![code coverage](https://img.shields.io/badge/coverage-100%25-success.svg)

### Requirements
- Node.js
- Java VM

### Usage

#### CLI
- Install the server: `npm i -g @rmlio/rmlmapper-webapi`.
- Start the server: `rmlmapper-webapi`.
- The server is available at `http://localhost:4000` (if port is unchanged).

The following paramaters can be used to configure the server:

- `-V, --version`: output the version number
- `-p, --port [port]`: Port of the server (default: 4000).
- `-e, --baseURL [url]`: Url of the server (default: http://localhost:4000).
- `-r, --rmlmapper [path]`: Path to the RMLMapper jar (default: rmlmapper.jar).
- `--rmlmapper-version [version]`: Version of the used RMLMapper.
- `-t, --removeTempFolders`: True if temp folders should be removed, else false (default: true).
- `-b, --basePath [path]`: The path preceding all routes (default: /).
- `-l, --logLevel [level]`: The log level used by the logger (default: info)
 - `-h, --help`: output usage information


#### Docker
- Build image: `docker build -t rmlmapper-webapi .`.
- Run container: `docker run rmlmapper-webapi`.

### Configuration file
Parameters can also be set via a configuration file called `config.json`, 
which is located in the current working directory,
and contains the following settings:

- `rmlmapper.path`: path to the RMLMapper jar.
- `rmlmapper.version`: version of the used RMLMapper. This is shown on the main page of the API.
- `baseURL`: url of where the API will be available. This is shown on the main page of the API.
- `removeTempFolders`: if this is set true, temporary folders are removed once the execution of one call is done.
- `logLevel`: log level used by the logger (default: info).
- `port`: port of the server (default: 4000).
- `basePath`: the path preceding all routes (default: /).

An example can be found in `config_example.json`.
The latest version of the RMLMapper is downloaded when running the server if no `rmlmapper.path` is given.
The version is automatically determined.

### How to make API calls

When the server is running you can find the descriptions of the calls at the root of the server (e.g., `http://localhost:4000`).
The calls are also described using the [Open API specification](https://github.com/OAI/OpenAPI-Specification) in `/swagger.yaml`.

### Run tests

- Install dependencies: `npm install`.
- The RMLMapper needs to be available in the root and called `rmlmapper.jar`.
Get the latest version via `npm run download:rmlmapper`.
- Run the tests: `npm test`.
The test framework is [Mocha](https://mochajs.org/) and the code coverage is provided via [Istanbul](https://istanbul.js.org/)

### License

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/) and 
released under the [MIT license](http://opensource.org/licenses/MIT).
