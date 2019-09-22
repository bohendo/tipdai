FROM node:10-alpine
WORKDIR /root
ENV HOME /root
RUN apk add bash
COPY dist dist
ENTRYPOINT ["node", "dist/main.js"]
