
project="tipdai"
registry=$(shell whoami)
flags=.makeflags
$(shell mkdir -p $(flags))

VPATH=$(flags)
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

default: all
all: tipdai proxy

clean:
	rm $(flags)/*

start: all
	bash ops/start.sh

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

tipdai: node-modules ops/bot.dockerfile $(shell find src $(find_options))
	$(log_start)
	docker build --file ops/bot.dockerfile --tag tipdai_bot:latest .
	touch $(flags)/$@
	$(log_finish) && touch $(flags)/$@
