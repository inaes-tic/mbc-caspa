#!/bin/bash

# Create po files for all supported languages

for l in en-US es db_LB it_CH arq; do
    mkdir -p locale/${l}/LC_MESSAGES/
    for t in messages client; do
        if test -f ./locale/templates/LC_MESSAGES/${t}.pot; then
            if test -f ./locale/${l}/LC_MESSAGES/${t}.po; then
                msgmerge ./locale/${l}/LC_MESSAGES/${t}.po \
                    ./locale/templates/LC_MESSAGES/${t}.pot \
                    --output-file=./locale/${l}/LC_MESSAGES/${t}.po 
            else
                msginit --no-translator \
                    --input=./locale/templates/LC_MESSAGES/${t}.pot \
                    --output-file=./locale/${l}/LC_MESSAGES/${t}.po \
                    -l ${l}
            fi
            msgfmt ./locale/${l}/LC_MESSAGES/${t}.po \
                --output-file=./locale/${l}/LC_MESSAGES/${t}.mo \
                ${NULL}
        fi
    done
done
