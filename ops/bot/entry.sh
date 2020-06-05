#!/bin/bash
set -e

if [[ "$NODE_ENV" == "production" ]]
then
  echo "Starting bot in prod-mode"
  node dist/main.js
else
  echo "Starting bot in dev-mode"
  nodemon \
    --delay 1 \
    --exitcrash \
    --ignore *.test.ts \
    --ignore *.swp \
    --legacy-watch \
    --polling-interval 1000 \
    --watch src \
    --exec ts-node \
    ./src/main.ts
fi
