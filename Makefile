all: update serve

mos: locale/es/LC_MESSAGES/messages.mo

locale/es/LC_MESSAGES/messages.mo:
	./bin/extract_po.sh
	./bin/update_languages.sh

submodules: sparkmd5 i18n-abide fluent-ffmpeg
	git submodule update

sparkmd5: vendor/sparkmd5/spark-md5.js

i18n-abide: node_modules node_modules/i18n-abide/package.json node_modules/i18n-abide/node_modules

fluent-ffmpeg: node_modules node_modules/fluent-ffmpeg/package.json node_modules/fluent-ffmpeg/node_modules

vendor/sparkmd5/spark-md5.js node_modules/i18n-abide/package.json node_modules/fluent-ffmpeg/package.json:
	git submodule update --init

node_modules:
	mkdir -p $@

node_modules/i18n-abide/node_modules node_modules/fluent-ffmpeg/node_modules:
	cd $(@:/node_modules=/) ; npm install

npm:
	npm install

update: submodules npm mos

serve:
	node server.js

.PHONY: npm submodules serve sparkmd5 i18n-abide fluent-ffmpeg
