FROM node:12.13.0-alpine3.10
WORKDIR /root
ENV HOME /root
RUN apk add bash
RUN npm install -g npm@6.14.4
COPY dist dist
COPY ops/bot/entry.sh /entry.sh
ENTRYPOINT ["bash", "/entry.sh"]
