
project=tipdai
registry=$(shell whoami)
flags=.makeflags
$(shell mkdir -p $(flags))

VPATH=$(flags):dist
SHELL=/bin/bash

cwd=$(shell pwd)
proxy=$(cwd)/ops/proxy

my_id=$(shell id -u):$(shell id -g)

find_options=-type f -not -path "*/node_modules/*" -not -name "*.swp" -not -path "*/.*" -not -name "*.log"

id=$(shell if [[ "`uname`" == "Darwin" ]]; then echo 0:0; else echo $(my_id); fi)

docker_run=docker run --name=$(project)_builder --tty --rm --volume=$(cwd):/root $(project)_builder $(id)

log_start=@echo "=============";echo "[Makefile] => Start building $@"; date "+%s" > $(flags)/.timestamp
log_finish=@echo "[Makefile] => Finished building $@ in $$((`date "+%s"` - `cat $(flags)/.timestamp`)) seconds";echo "=============";echo

########################################
## Phony Rules

default: dev
all: dev prod
dev: tipdai-image-dev proxy
prod: tipdai-image-prod proxy

clean:
	rm -rf dist/*
	rm -rf $(flags)/*

start: all
	bash ops/start.sh

stop:
	docker container stop $(project)_builder 2> /dev/null || true
	docker stack rm $(project) || true
	@echo -n "Waiting for the $(project) stack to shutdown."
	@while [[ -n "`docker container ls --quiet --filter label=com.docker.stack.namespace=$(project)`" ]]; do echo -n '.' && sleep 3; done
	@while [[ -n "`docker network ls --quiet --filter label=com.docker.stack.namespace=$(project)`" ]]; do echo -n '.' && sleep 3; done
	@echo ' Goodnight!'

reset: stop
	docker container prune -f
	docker volume rm tipdai_database_dev 2> /dev/null || true

restart: all stop
	bash ops/start.sh

restart-prod: stop
	bash ops/start.sh

push-latest: prod
	bash ops/push-images.sh latest bot proxy

########################################
## Real Rules

builder: ops/builder.dockerfile
	$(log_start)
	docker build --file ops/builder.dockerfile --tag $(project)_builder .
	$(log_finish) && touch $(flags)/$@

node-modules: builder package.json
	$(log_start)
	$(docker_run) "npm install"
	$(log_finish) && touch $(flags)/$@

proxy: $(proxy)/entry.sh $(proxy)/nginx.conf $(proxy)/nginx.dockerfile
	$(log_start)
	docker build --file $(proxy)/nginx.dockerfile --tag tipdai_proxy:latest .
	$(log_finish) && touch $(flags)/$@

tipdai-image-dev: tipdai-js ops/bot.dockerfile 
	$(log_start)
	docker build --file ops/bot-dev.dockerfile --tag tipdai_bot_dev:latest .
	touch $(flags)/$@
	$(log_finish) && touch $(flags)/$@

tipdai-image-prod: tipdai-js node-modules ops/bot.dockerfile $(shell find src $(find_options))
	$(log_start)
	docker build --file ops/bot.dockerfile --tag tipdai_bot:latest .
	touch $(flags)/$@
	$(log_finish) && touch $(flags)/$@

tipdai-js: node-modules tsconfig.json $(shell find src $(find_options))
	$(log_start)
	$(docker_run) "tsc --project tsconfig.build.json"
	$(log_finish) && touch $(flags)/$@
