FROM node:10-alpine
WORKDIR /root
ENV HOME /root
COPY src src
ENTRYPOINT ["node", "src/index.js"]
