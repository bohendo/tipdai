FROM node:12.13.0-alpine3.10
WORKDIR /root
ENV HOME /root
RUN apk add bash
RUN npm install -g npm@6.14.4
RUN npm install -g nodemon
COPY dist dist
ENTRYPOINT ["nodemon", "-L", "--watch", "./dist", "dist/main.js"]
