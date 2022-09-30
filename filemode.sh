#!/bin/bash
set -e

for filename in ./rawhtml/*.html; do
    echo "$filename"
    node index.js "$filename"
done

python3 deduplicate.py

for filename in ./raw/*.json; do
    echo "$filename"
    node tocsv.js "$filename"
done
