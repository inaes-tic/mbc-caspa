all: update serve

mos: locale/es/LC_MESSAGES/messages.mo

locale/es/LC_MESSAGES/messages.mo:
	./bin/extract_po.sh
	./bin/update_languages.sh

submodules: sparkmd5 i18n-abide resumable.js melted-node node-mlt
	git submodule update

sparkmd5: vendor/sparkmd5/spark-md5.js

bootstrap: vendor/bootstrap/js/bootstrap-typeahead.js

vendor/bootstrap/js/bootstrap-typeahead.js vendor/sparkmd5/spark-md5.js:
	git submodule update --init

node_modules:
	mkdir -p $@

npm:
	npm install

update: submodules npm mos

serve:
	node server.js

.PHONY: npm submodules serve sparkmd5 bootstrap
