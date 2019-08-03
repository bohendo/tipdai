FROM node:10-alpine
WORKDIR /root
ENV HOME /root
RUN npm install -g nodemon
COPY src src
ENTRYPOINT ["nodemon", "-L", "src/index.js"]
