export MOCHA=node_modules/mocha/bin/mocha
export NODE_CONFIG_DIR ?= $(PWD)/node_modules/mbc-common/config

all: update serve

mos: locale/es/LC_MESSAGES/messages.mo

locale/es/LC_MESSAGES/messages.mo:
	./bin/extract_po.sh
	./bin/update_languages.sh
	./bin/compile-json locale locale

node_modules:
	mkdir -p $@

npm:
	npm install

update: npm mos

test:
	@LOG_LEVEL=error CASPA_NOAUTH=true ${MOCHA} --reporter spec --timeout 10000 test

test_debug:
	@LOG_LEVEL=error ${MOCHA} --debug-brk --reporter spec test

serve: update
	node server.js

serve_noweb:
	node server.js

serve_debug:
	node --debug-brk server.js

.PHONY: npm serve test test_debug serve_noweb serve_debug
