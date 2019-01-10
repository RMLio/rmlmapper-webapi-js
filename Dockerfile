FROM ubuntu:16.04

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_11.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install -y build-essential
RUN apt-get install -y python
RUN apt-get install -y default-jre
RUN apt-get install -y git-core

ADD repo-key /
RUN \
  chmod 600 /repo-key && \
  echo "IdentityFile /repo-key" >> /etc/ssh/ssh_config && \
  #echo -e "StrictHostKeyChecking no" >> /etc/ssh/ssh_config && \
  mkdir /root/.ssh && \
  ssh-keyscan gitlab.ilabt.imec.be >> /root/.ssh/known_hosts


ADD . /rmlmapper-webapi-js/

WORKDIR rmlmapper-webapi-js
RUN npm install

#after boot
CMD npm start
