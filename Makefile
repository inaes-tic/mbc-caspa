all: update serve

mos: locale/es/LC_MESSAGES/messages.mo

locale/es/LC_MESSAGES/messages.mo:
	./bin/extract_po.sh
	./bin/update_languages.sh

submodules: sparkmd5 i18n-abide resumable.js melted-node node-mlt
	git submodule update

sparkmd5: vendor/sparkmd5/spark-md5.js

bootstrap: vendor/bootstrap/js/bootstrap-typeahead.js

i18n-abide: node_modules node_modules/i18n-abide/package.json node_modules/i18n-abide/node_modules

resumable.js: node_modules node_modules/resumable.js/package.json node_modules/resumable.js/node_modules

melted-node: node_modules node_modules/melted-node/package.json node_modules/melted-node/node_modules

node-mlt: node_modules node_modules/node-mlt/package.json node_modules/node-mlt/node_modules

backbone.io: node_modules node_modules/backbone.io/package.json node_modules/backbone.io/node_modules

vendor/bootstrap/js/bootstrap-typeahead.js vendor/sparkmd5/spark-md5.js node_modules/i18n-abide/package.json node_modules/node-mlt/package.json node_modules/backbone.io/package.json:
	git submodule update --init

node_modules:
	mkdir -p $@

node_modules/i18n-abide/node_modules node_modules/resumable.js/node_modules node_modules/melted-node/node_modules node_modules/node-mlt/node_modules node_modules/backbone.io/node_modules:
	cd $(@:/node_modules=/) ; npm install

npm:
	npm install

update: submodules npm mos

serve:
	node server.js

.PHONY: npm submodules serve sparkmd5 i18n-abide resumable.js bootstrap melted-node node-mlt backbone.io
