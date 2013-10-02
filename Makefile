export MOCHA=node_modules/mocha/bin/mocha
export NODE_CONFIG_DIR ?= $(PWD)/node_modules/mbc-common/config

all: update serve

mos: locale/es/LC_MESSAGES/messages.mo

locale/es/LC_MESSAGES/messages.mo:
	./bin/extract_po.sh
	./bin/update_languages.sh
	./bin/compile-json locale locale

submodules: sparkmd5 bootstrap knockout-sortable visualsearch bootstrap-paginator backbone.memento
	git submodule update

sparkmd5: vendor/sparkmd5/spark-md5.js

bootstrap: vendor/bootstrap/js/bootstrap-typeahead.js

knockout-sortable: vendor/knockout-sortable/build/knockout-sortable.js

visualsearch: vendor/visualsearch/build/visualsearch.js

bootstrap-paginator: vendor/bootstrap-paginator/build/bootstrap-paginator.min.js

backbone.memento: vendor/backbone.memento/backbone.memento.js

vendor/bootstrap/js/bootstrap-typeahead.js vendor/sparkmd5/spark-md5.js vendor/knockout-sortable/build/knockout-sortable.js vendor/visualsearch/build/visualsearch.js vendor/bootstrap-paginator/build/bootstrap-paginator.min.js vendor/backbone.memento/backbone.memento.js:
	git submodule update --init

node_modules:
	mkdir -p $@

npm:
	npm install

update: submodules npm mos

test:
	@LOG_LEVEL=error ${MOCHA} --reporter spec --timeout 10000 test

test_debug:
	@LOG_LEVEL=error ${MOCHA} --debug-brk --reporter spec test

serve: update
	node server.js

serve_noweb:
	node server.js

serve_debug:
	node --debug-brk server.js

.PHONY: npm submodules serve sparkmd5 bootstrap knockout-sortable visualsearch bootstrap-paginator backbone.memento test test_debug serve_noweb serve_debug
