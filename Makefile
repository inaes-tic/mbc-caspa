all: update serve

mos: locale/es/LC_MESSAGES/messages.mo

locale/es/LC_MESSAGES/messages.mo:
	./bin/extract_po.sh
	./bin/update_languages.sh

submodules: sparkmd5 bootstrap
	git submodule update

sparkmd5: vendor/sparkmd5/spark-md5.js

bootstrap: vendor/bootstrap/js/bootstrap-typeahead.js

knockout-sortable: vendor/knockout-sortable/build/knockout-sortable.js

vendor/bootstrap/js/bootstrap-typeahead.js vendor/sparkmd5/spark-md5.js vendor/knockout-sortable/build/knockout-sortable.js:
	git submodule update --init

node_modules:
	mkdir -p $@

npm:
	npm install

update: submodules npm mos

serve:
	node server.js

.PHONY: npm submodules serve sparkmd5 bootstrap
