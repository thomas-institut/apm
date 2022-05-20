#!/bin/bash
#
#
#  Copyright (C) 2019-2022 Universität zu Köln
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <https://www.gnu.org/licenses/>.

#
# createdist.bash
#
# Creates a distribution tar file for apm 
#
# Author: Rafael Nájera <rafael.najera@uni-koeln.de>
#


USAGE="USAGE: createdist <version>"

if (("$#" != 1)) ; then
   echo "$USAGE"
   exit
fi

VERSION=$1
TMP=/tmp
DIST_NAME=apm-$VERSION
DIST_DIR=dist
CUR_DIR=$(pwd)
TMP_DIR=$TMP/$DIST_NAME
TAR_NAME=$DIST_NAME.tar.gz

echo Creating $DIST_DIR/"$TAR_NAME"
if [ -d "$TMP_DIR" ]
then
  rm -fr "$TMP_DIR" || exit
fi

mkdir "$TMP_DIR" || exit

cp -R src/www/classes "$TMP_DIR"
cp -R src/www/collatex "$TMP_DIR"
cp -R src/www/css "$TMP_DIR"
cp -R src/www/images "$TMP_DIR"
cp -R src/www/js "$TMP_DIR"
rm -fr "$TMP_DIR"/js/istanbul
rm -f "$TMP_DIR"/js/Makefile
rm -f "$TMP_DIR"/js/.eslintrc.json
cp -R src/www/node_modules "$TMP_DIR"
cp -R src/www/plugins "$TMP_DIR"
cp -R src/www/templates "$TMP_DIR"
cp -R src/www/utilities "$TMP_DIR"
cp -R src/www/vendor "$TMP_DIR"
cp -R src/www/fonts "$TMP_DIR"
cp src/www/composer.json "$TMP_DIR"
cp src/www/composer.lock "$TMP_DIR"
cp src/www/config.sample.php "$TMP_DIR"
cp src/www/index.php "$TMP_DIR"
cp src/www/package.json "$TMP_DIR"
cp src/www/setup.php "$TMP_DIR"
cp src/www/version.php "$TMP_DIR"

mkdir "$TMP_DIR"/downloads
mkdir "$TMP_DIR"/downloads/pdf

chmod a+w "$TMP_DIR"/downloads
chmod a+w "$TMP_DIR"/downloads/pdf


cd "$TMP" || exit

tar cfz "$TAR_NAME" "$DIST_NAME"
rm -fr "$DIST_NAME"
mv "$TAR_NAME" "$CUR_DIR"/$DIST_DIR/

cd "$CUR_DIR" || exit
