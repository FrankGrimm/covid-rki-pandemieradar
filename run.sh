#!/bin/bash
set -e

mkdir -p rawhtml
mkdir -p raw

# download latest
node index.js

LASTFILE="$(find "./rawhtml" -maxdepth 1 -type f -exec stat -c "%y %n" {} + | sort -r | head -1 | cut -d" " -f4-)"
echo "$LASTFILE"

# fix and rerun in filemode
node index.js "$LASTFILE"

# export data
node tocsv.js

git add screenshot.png data/
git commit -m "$(date +%F)"
git push
