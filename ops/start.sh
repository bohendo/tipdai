#!/usr/bin/env bash
set -e

project="tipdai"
registry="`whoami`"

# turn on swarm mode if it's not already on
docker swarm init 2> /dev/null || true

####################
# External Env Vars

TIPDAI_DOMAINNAME="${TIPDAI_DOMAINNAME:-localhost}"
TIPDAI_EMAIL="${TIPDAI_EMAIL:-noreply@gmail.com}" # for notifications when ssl certs expire

TIPDAI_CONSUMER_KEY="${TIPDAI_CONSUMER_KEY}"
TIPDAI_CONSUMER_SECRET="${TIPDAI_CONSUMER_SECRET}"
TIPDAI_BOT_ACCESS_TOKEN="${TIPDAI_BOT_ACCESS_TOKEN}"
TIPDAI_BOT_ACCESS_SECRET="${TIPDAI_BOT_ACCESS_SECRET}"
TIPDAI_DEV_ACCESS_TOKEN="${TIPDAI_DEV_ACCESS_TOKEN}"
TIPDAI_DEV_ACCESS_SECRET="${TIPDAI_DEV_ACCESS_SECRET}"
TIPDAI_WEBHOOK_ID="${TIPDAI_WEBHOOK_ID}"

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
# Internal Config

log_level="3" # set to 5 for all logs or to 0 for none
version=latest
proxy_image="${project}_proxy:$version"
bot_image="${project}_bot:$version"

number_of_services=2 # NOTE: Gotta update this manually when adding/removing services :(

####################
# Deploy according to above configuration

echo "Deploying proxy: $proxy_image and bot: $bot_image to $TIPDAI_DOMAINNAME"

mkdir -p /tmp/$project
cat - > /tmp/$project/docker-compose.yml <<EOF
version: '3.4'

volumes:
  certs:

services:
  proxy:
    image: $proxy_image
    environment:
      DOMAINNAME: $TIPDAI_DOMAINNAME
      EMAIL: $TIPDAI_EMAIL
      UPSTREAM_URL: http://bot:8080
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - certs:/etc/letsencrypt

  bot:
    image: $bot_image
    environment:
      CALLBACK_URL: $TIPDAI_DOMAINNAME
      CONSUMER_KEY: $TIPDAI_CONSUMER_KEY
      CONSUMER_SECRET: $TIPDAI_CONSUMER_SECRET
      BOT_ACCESS_TOKEN: $TIPDAI_BOT_ACCESS_TOKEN
      BOT_ACCESS_SECRET: $TIPDAI_BOT_ACCESS_SECRET
      DEV_ACCESS_TOKEN: $TIPDAI_DEV_ACCESS_TOKEN
      DEV_ACCESS_SECRET: $TIPDAI_DEV_ACCESS_SECRET
      WEBHOOK_ID: $TIPDAI_WEBHOOK_ID
    volumes:
      - `pwd`/node_modules:/root/node_modules
EOF

docker stack deploy -c /tmp/$project/docker-compose.yml $project

echo -n "Waiting for the $project stack to wake up."
while [[ "`docker container ls | grep $project | wc -l | tr -d ' '`" != "$number_of_services" ]]
do echo -n "." && sleep 2
done
echo " Good Morning!"
