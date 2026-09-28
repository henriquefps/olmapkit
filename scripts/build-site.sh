#!/bin/sh
# Assembles the static demo site in site/ (demo app, library build and the legacy sandbox)
set -e
cd "$(dirname "$0")/.."
rm -rf site
mkdir -p site
cp -R demo dist site/
mkdir -p site/legacy
cp -R legacy/sandbox legacy/init_map.js legacy/reset_environment.js site/legacy/
printf '/ /demo/ 302\n' > site/_redirects
echo "Site built in site/"
