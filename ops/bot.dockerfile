FROM node:10-alpine
WORKDIR /root
ENV HOME /root
COPY dist dist
ENTRYPOINT ["node", "dist/index.js"]
