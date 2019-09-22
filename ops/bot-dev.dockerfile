FROM node:10-alpine
WORKDIR /root
ENV HOME /root
RUN apk add bash
RUN npm install -g nodemon
COPY dist dist
ENTRYPOINT ["nodemon", "-L", "dist/main.js"]
