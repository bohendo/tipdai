FROM node:12.13.0-alpine3.10
WORKDIR /root
ENV HOME /root
RUN apk add bash
RUN npm install -g npm@6.14.4
RUN npm install -g nodemon ts-node
COPY dist dist
ENTRYPOINT "nodemon"
CMD [\
  "--delay=1",\
  "--exitcrash",\
  "--ignore=*.test.ts",\
  "--ignore=*.swp",\
  "--legacy-watch",\
  "--polling-interval=1000",\
  "--watch=src",\
  "--exec=ts-node",\
  "./src/main.ts"\
]
