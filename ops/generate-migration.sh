#!/bin/bash
set -e

project="`cat package.json | grep '"name":' | awk -F '"' '{print $4}'`"
service="bot"
container="`docker container ls -q -f name=${project}_${service}`"
name="$1"
if [[ -z "$name" ]]
then echo "Provide a name for this migration as the first & only arg" && exit
fi

docker exec $container bash -c '
  export TYPEORM_CONNECTION="postgres"
  export TYPEORM_DATABASE="$PGDATABASE"
  export TYPEORM_ENTITIES=dist/deposit/deposit.entity.js
  export TYPEORM_HOST="$PGHOST"
  export TYPEORM_MIGRATIONS="dist/migrations/*"
  export TYPEORM_MIGRATIONS_DIR="src/migrations"
  export TYPEORM_PASSWORD="`cat $PGPASSFILE`"
  export TYPEORM_PORT="$PGPORT"
  export TYPEORM_USERNAME="$PGUSER"
  env
  echo
  ./node_modules/.bin/typeorm migration:generate -n '"$name"'
'

