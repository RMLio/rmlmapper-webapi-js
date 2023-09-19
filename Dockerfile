FROM node:20-alpine3.18

RUN apk --no-cache add openjdk17-jre-headless

ADD . /rmlmapper-webapi-js/

WORKDIR rmlmapper-webapi-js
RUN npm install && \
    wget --output-document=rmlmapper.jar https://github.com/RMLio/rmlmapper-java/releases/download/v6.2.1/rmlmapper-6.2.1-r368-all.jar && \
    echo 'v6.2.1' > rmlmapper-version.txt


#after boot
ENTRYPOINT ["./bin/cli.js"]
