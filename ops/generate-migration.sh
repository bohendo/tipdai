#!/bin/bash
set -e

project="`cat package.json | grep '"name":' | awk -F '"' '{print $4}'`"
service="bot"
container="`docker container ls -q -f name=${project}_${service}`"
name="$1"
if [[ -z "$name" ]]
then echo "Provide a name for this migration as the first & only arg" && exit
fi

id=$(if [[ "`uname`" == "Darwin" ]]; then echo 0:0; else echo `id -u`:`id -g`; fi)

echo "my id: $id"

docker exec $container bash ops/permissions-fixer.sh $id '
  export TYPEORM_CONNECTION="postgres"
  export TYPEORM_DATABASE="$PGDATABASE"
  export TYPEORM_ENTITIES=dist/*/*.entity.js
  export TYPEORM_HOST="$PGHOST"
  export TYPEORM_MIGRATIONS="dist/migrations/*"
  export TYPEORM_MIGRATIONS_DIR="src/migrations"
  export TYPEORM_PASSWORD="`cat $PGPASSFILE`"
  export TYPEORM_PORT="$PGPORT"
  export TYPEORM_USERNAME="$PGUSER"
  ./node_modules/.bin/typeorm migration:generate -n '"$name"'
'

