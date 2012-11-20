all: update serve

mos: locale/es/LC_MESSAGES/messages.mo

locale/es/LC_MESSAGES/messages.mo:
	./bin/extract_po.sh
	./bin/update_languages.sh

submodules: vendor/sparkmd5/sparkmd5.js node_modules node_modules/i18n-abide/node_modules node_modules/fluent-ffmpeg/node_modules
	git submodule update

vendor/sparkmd5/sparkmd5.js:
	git submodule update --init

node_modules:
	mkdir -p $@

node_modules/i18n-abide/node_modules node_modules/fluent-ffmpeg/node_modules:
	cd $@/.. ; npm install

npm:
	npm install

update: submodules npm mos

serve:
	node server.js

.PHONY: npm submodules serve
