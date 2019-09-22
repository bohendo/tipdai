#!/usr/bin/env bash
set -e

prod_server="tipdai.`whoami`.com"
branch="master"
user=tipdai
ssh_key="$HOME/.ssh/`whoami`"
push="${1:-none}"

if [[ ! -f "$ssh_key" ]]
then echo "To deploy to $prod_server, you need to have an ssh key at: $ssh_key" && exit
fi

if [[ "$push" == "local" ]]
then make push-latest
fi

echo "Preparing to re-deploy this app to $prod_server. Without running any tests. Good luck."
sleep 2 # Give the user one last chance to ctrl-c before we pull the trigger

ssh -i $ssh_key $user@$prod_server "bash -c '
  git clone https://github.com/bohendo/tipdai.git 2> /dev/null || true
  cd tipdai && git fetch && git checkout --force $branch && git reset --hard origin/$branch
'"

if [[ "$push" == "remote" ]]
then
  ssh -i $ssh_key $user@$prod_server "bash -c '
    cd tipdai && make push-latest && make restart-prod && bash ops/logs.sh bot
  '"
elif [[ "$push" == "local" ]]
then
  ssh -i $ssh_key $user@$prod_server "bash -c '
    cd tipdai && docker pull bohendo/tipdai_bot:latest && make restart-prod && bash ops/logs.sh bot
  '"
fi
