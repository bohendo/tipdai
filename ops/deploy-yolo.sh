#!/usr/bin/env bash
set -e

prod_server="tipdai.`whoami`.com"
branch="master"
user=tipdai
ssh_key="$HOME/.ssh/`whoami`"

if [[ ! -f "$ssh_key" ]]
then echo "To deploy to $prod_server, you need to have an ssh key at: $ssh_key" && exit
fi

echo "Deploying to server at: $prod_server"

# echo;echo "Rebuilding a production-version of the app & pushing images to our container registry"
# make push-latest

echo;echo
echo "Preparing to re-deploy this app to $prod_server. Without running any tests. Good luck."
echo;echo
sleep 2 # Give the user one last chance to ctrl-c before we pull the trigger

ssh -i $ssh_key $user@$prod_server "bash -c '
  git clone https://github.com/bohendo/tipdai.git 2> /dev/null || true
'"

ssh -i $ssh_key $user@$prod_server "bash -c '
  cd tipdai && git fetch && git checkout --force $branch && git reset --hard origin/$branch
'"

ssh -i $ssh_key $user@$prod_server "bash -c '
  cd tipdai && make push-latest
'"
ssh -i $ssh_key $user@$prod_server "bash -c '
  cd tipdai && make restart-prod
'"
