#!/usr/bin/env bash
set -e

project="tipdai"
registry="bohendo"

# turn on swarm mode if it's not already on
docker swarm init 2> /dev/null || true

####################
# External Env Vars

TIPDAI_MODE="${TIPDAI_MODE:-development}"
TIPDAI_DOMAINNAME="${TIPDAI_DOMAINNAME:-localhost}"
TIPDAI_EMAIL="${TIPDAI_EMAIL:-noreply@gmail.com}" # for notifications when ssl certs expire

TIPDAI_CONSUMER_KEY="${TIPDAI_CONSUMER_KEY}"
TIPDAI_CONSUMER_SECRET="${TIPDAI_CONSUMER_SECRET}"
TIPDAI_BOT_ACCESS_TOKEN="${TIPDAI_BOT_ACCESS_TOKEN}"
TIPDAI_BOT_ACCESS_SECRET="${TIPDAI_BOT_ACCESS_SECRET}"
TIPDAI_DEV_ACCESS_TOKEN="${TIPDAI_DEV_ACCESS_TOKEN}"
TIPDAI_DEV_ACCESS_SECRET="${TIPDAI_DEV_ACCESS_SECRET}"
TIPDAI_WEBHOOK_ID="${TIPDAI_WEBHOOK_ID}"

TIPDAI_ETH_PROVIDER="${TIPDAI_ETH_PROVIDER:-http://localhost:8545}"
TIPDAI_PAYMENT_HUB="${TIPDAI_PAYMENT_HUB:-nats://localhost:4222}"

####################
# Internal Config

log_level="3" # set to 5 for all logs or to 0 for none
version=latest

####################
# Helper Functions

# Get images that we aren't building locally
function pull_if_unavailable {
  if [[ -z "`docker image ls | grep ${1%:*} | grep ${1#*:}`" ]]
  then
    # But actually don't pull images if we're running locally
    if [[ "$INDRA_V2_DOMAINNAME" != "localhost" ]]
    then docker pull $1
    fi
  fi
}

# Initialize random new secrets
function new_secret {
  secret="$2"
  if [[ -z "$secret" ]]
  then secret=`head -c 32 /dev/urandom | xxd -plain -c 32 | tr -d '\n\r'`
  fi
  if [[ -z "`docker secret ls -f name=$1 | grep -w $1`" ]]
  then
    id=`echo "$secret" | tr -d '\n\r' | docker secret create $1 -`
    echo "Created secret called $1 with id $id"
  fi
}

####################
# Ethereum Config

echo "Checking $TIPDAI_ETH_PROVIDER"

if [[ -z "$TIPDAI_ETH_PROVIDER" ]]
then
  echo "An env var called TIPDAI_ETH_PROVIDER is required"
  exit
else
  chainId="`curl -q -k -s -H "Content-Type: application/json" -X POST --data '{"id":1,"jsonrpc":"2.0","method":"net_version","params":[]}' $TIPDAI_ETH_PROVIDER | jq .result | tr -d '"'`"
fi

echo "Got chain id: $chainId"

if [[ "$chainId" == "4" ]]
then ethNetwork="rinkeby"
elif [[ "$chainId" == "42" ]]
then ethNetwork="kovan"
elif [[ "$chainId" == "4447" ]]
then ethNetwork="ganache"
else
  echo "Ethereum chain \"$chainId\" is not supported yet"
  exit
fi

mnemonic="${project}_mnemonic_${ethNetwork}"

if [[ -z "`docker secret ls | grep "$mnemonic"`" ]]
then
  echo "Missing secret called: $mnemonic, create like with:"
  echo "echo 'first word second etc' | tr -d '\n\r' | docker secret create $mnemonic -"
  exit
fi

####################
# Database Config

if [[ "$TIPDAI_MODE" == "production" ]]
then db_volume=${project}_database
else db_volume=${project}_database_dev
fi

# database connection settings
postgres_db="$project"
postgres_host="database"
postgres_port="5432"
postgres_user="$project"
postgres_password_file="/run/secrets/${project}_db_password"

####################
# Docker Image Config

database_image="postgres:9-alpine"

if [[ "$TIPDAI_MODE" == "production" ]]
then
  bot_image="$registry/${project}_bot:$version"
  proxy_image="$registry/${project}_proxy:$version"
else
  bot_image="${project}_bot_dev:$version"
  proxy_image="${project}_proxy:$version"
fi

pull_if_unavailable $bot_image
pull_if_unavailable $database_image
pull_if_unavailable $proxy_image

####################
# Deploy according to above configuration

new_secret ${project}_db_password
echo "Deploying proxy: $proxy_image and bot: $bot_image to $TIPDAI_DOMAINNAME"

number_of_services=3

mkdir -p /tmp/$project
cat - > /tmp/$project/docker-compose.yml <<EOF
version: '3.4'

secrets:
  ${project}_db_password:
    external: true
  $mnemonic:
    external: true

volumes:
  certs:
  $db_volume:
    external: true

services:
  proxy:
    image: $proxy_image
    environment:
      DOMAINNAME: $TIPDAI_DOMAINNAME
      EMAIL: $TIPDAI_EMAIL
      UPSTREAM_URL: http://bot:3000
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - certs:/etc/letsencrypt

  bot:
    image: $bot_image
    environment:
      ETH_PROVIDER: $TIPDAI_ETH_PROVIDER
      MNEMONIC_FILE: /run/secrets/$mnemonic
      NODE_ENV: $TIPDAI_MODE
      PAYMENT_HUB: $TIPDAI_PAYMENT_HUB
      PGDATABASE: $postgres_db
      PGHOST: $postgres_host
      PGPASSFILE: $postgres_password_file
      PGPORT: $postgres_port
      PGUSER: $postgres_user
      TWITTER_BOT_ACCESS_SECRET: $TIPDAI_BOT_ACCESS_SECRET
      TWITTER_BOT_ACCESS_TOKEN: $TIPDAI_BOT_ACCESS_TOKEN
      TWITTER_CALLBACK_URL: $TIPDAI_DOMAINNAME
      TWITTER_CONSUMER_KEY: $TIPDAI_CONSUMER_KEY
      TWITTER_CONSUMER_SECRET: $TIPDAI_CONSUMER_SECRET
      TWITTER_WEBHOOK_ID: $TIPDAI_WEBHOOK_ID
    secrets:
      - $mnemonic
      - ${project}_db_password
    volumes:
      - `pwd`/node_modules:/root/node_modules
      - `pwd`/dist:/root/dist

  database:
    image: $database_image
    deploy:
      mode: global
    environment:
      POSTGRES_DB: $postgres_db
      POSTGRES_PASSWORD_FILE: $postgres_password_file
      POSTGRES_USER: $postgres_user
    secrets:
      - ${project}_db_password
    volumes:
      - $db_volume:/var/lib/postgresql/data

EOF

docker stack deploy -c /tmp/$project/docker-compose.yml $project

echo -n "Waiting for the $project stack to wake up."
while [[ "`docker container ls | grep $project | wc -l | tr -d ' '`" != "$number_of_services" ]]
do echo -n "." && sleep 2
done
echo " Good Morning!"
