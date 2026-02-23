FROM node:20-alpine3.18

RUN apk --no-cache add openjdk17-jre-headless

ADD . /rmlmapper-webapi-js/

WORKDIR rmlmapper-webapi-js
RUN npm install && \
    wget --output-document=burp.jar https://cloud.ilabt.imec.be/index.php/s/NpYDeNtPadRQofY/download/burp.jar && \
    echo 'kgc-2025-conformance' > burp-version.txt && \
    wget --output-document=rmlmapper.jar https://github.com/RMLio/rmlmapper-java/releases/download/v7.1.2/rmlmapper-7.1.2-r374-all.jar && \
    echo 'v7.1.2' > rmlmapper-version.txt


#after boot
ENTRYPOINT ["./bin/cli.js --supportBurp"]
