#!/bin/bash
set -e

project="`cat package.json | grep '"name":' | awk -F '"' '{print $4}'`"
name=$1
shift

docker service ps --no-trunc ${project}_$name
sleep 1
docker service logs --raw --tail 100 --follow ${project}_$name $@
