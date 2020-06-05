
project=tipdai
registry=$(shell whoami)
flags=.makeflags
$(shell mkdir -p $(flags))

VPATH=$(flags):dist
SHELL=/bin/bash

cwd=$(shell pwd)

my_id=$(shell id -u):$(shell id -g)

find_options=-type f -not -path "*/node_modules/*" -not -name "*.swp" -not -path "*/.*" -not -name "*.log"

id=$(shell if [[ "`uname`" == "Darwin" ]]; then echo 0:0; else echo $(my_id); fi)

interactive=$(shell if [[ -t 0 && -t 2 ]]; then echo "--interactive"; else echo ""; fi)

docker_run=docker run --name=$(project)_builder $(interactive) --tty --rm --volume=$(cwd):/root $(project)_builder $(id)

log_start=@echo "=============";echo "[Makefile] => Start building $@"; date "+%s" > $(flags)/.timestamp
log_finish=@echo "[Makefile] => Finished building $@ in $$((`date "+%s"` - `cat $(flags)/.timestamp`)) seconds";echo "=============";echo

########################################
## Phony Rules
.PHONY: test

default: dev
all: dev prod
dev: tipdai-image-dev proxy
prod: tipdai-image-prod proxy

start: all
	bash ops/start.sh

stop:
	docker container stop $(project)_builder 2> /dev/null || true
	docker stack rm $(project) || true
	@echo -n "Waiting for the $(project) stack to shutdown."
	@while [[ -n "`docker container ls --quiet --filter label=com.docker.stack.namespace=$(project)`" ]]; do echo -n '.' && sleep 3; done
	@while [[ -n "`docker network ls --quiet --filter label=com.docker.stack.namespace=$(project)`" ]]; do echo -n '.' && sleep 3; done
	@echo ' Goodnight!'

clean: stop
	rm -rf dist/*
	rm -rf $(flags)/*

deploy:
	bash ops/deploy.sh remote

deploy-fast:
	bash ops/deploy.sh none

reset: stop
	docker container prune -f
	docker volume rm tipdai_database_dev 2> /dev/null || true
	rm -rf .channel-store

restart: stop
	bash ops/start.sh

restart-prod: stop
	TIPDAI_MODE=production bash ops/start.sh

push-latest: prod
	bash ops/push-images.sh latest bot proxy

test: dev
	$(docker_run) "node test/entry.js"

########################################
## Real Rules

builder: $(shell find ops/builder $(find_options))
	$(log_start)
	docker build --file ops/builder/Dockerfile --tag $(project)_builder ops/builder
	$(log_finish) && touch $(flags)/$@

node-modules: builder package.json
	$(log_start)
	$(docker_run) "npm install"
	$(log_finish) && touch $(flags)/$@

tipdai-js: node-modules tsconfig.json $(shell find src $(find_options))
	$(log_start)
	$(docker_run) "rm -rf dist/* && tsc --project tsconfig.build.json"
	$(log_finish) && touch $(flags)/$@

tipdai-image-dev: tipdai-js $(shell find ops/bot $(find_options))
	$(log_start)
	docker build --file ops/bot/dev.dockerfile --tag tipdai_bot_dev:latest .
	touch $(flags)/$@
	$(log_finish) && touch $(flags)/$@

tipdai-image-prod: tipdai-js $(shell find ops/bot $(find_options))
	$(log_start)
	docker build --file ops/bot/prod.dockerfile --tag tipdai_bot:latest .
	touch $(flags)/$@
	$(log_finish) && touch $(flags)/$@

proxy: $(shell find ops/proxy $(find_options))
	$(log_start)
	docker build --file ops/proxy/Dockerfile --tag tipdai_proxy:latest ops/proxy
	$(log_finish) && touch $(flags)/$@
