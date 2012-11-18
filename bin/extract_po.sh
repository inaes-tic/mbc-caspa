#!/bin/bash

# syntax:
# extract-po.sh

# No -j on first line, to clear out .pot file (Issue#1170)

# messages.po is server side strings
xgettext --keyword=_ -L Perl --output-dir=locale/templates/LC_MESSAGES --from-code=utf-8 --output=messages.pot\
 `find routes -name '*.js' | grep -v 'i18n.js'`
xgettext -j --keyword=_ -L Python --output-dir=locale/templates/LC_MESSAGES --from-code=utf-8 --output=messages.pot `find views -name '*.jade'`
xgettext -j --keyword=_ -L Python --output-dir=locale/templates/LC_MESSAGES --from-code=utf-8 --output=messages.pot `find modelse -name '*.js'`

# i18n-abide supports client-side gettext too. Usually you won't need this, unless your doing some
# fancy new fangled webapp.
#
# client.po, assuming you have gettext strings in your client files (.js, .ejs)
# js
xgettext -L Perl --output-dir=locale/templates/LC_MESSAGES --from-code=utf-8 --output=client.pot \
`find public -name '*.js' | grep -v 'gettext.js'`

# ejs
# xgettext -j -L PHP --keyword=_ --output-dir=locale/templates/LC_MESSAGES --output=client.pot `find client -name '*.ejs'`
