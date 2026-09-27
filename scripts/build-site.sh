#!/bin/sh
# Assembles the static demo site in dist/ (only what the browser needs)
set -e
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
cp -R demo src dist/
printf '/ /demo/ 302\n' > dist/_redirects
echo "Site built in dist/"
