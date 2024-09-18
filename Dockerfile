FROM node:20-alpine3.18

RUN apk --no-cache add openjdk17-jre-headless

ADD . /rmlmapper-webapi-js/

WORKDIR rmlmapper-webapi-js
RUN npm install && \
    wget --output-document=rmlmapper.jar https://github.com/RMLio/rmlmapper-java/releases/download/v7.1.0/rmlmapper-7.1.0-r374-all.jar && \
    echo 'v7.1.0' > rmlmapper-version.txt


#after boot
ENTRYPOINT ["./bin/cli.js"]
