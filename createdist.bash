#!/bin/bash
#
#
#  Copyright (C) 2019 Universität zu Köln
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

cp -R src/public/classes "$TMP_DIR"
cp -R src/public/collatex "$TMP_DIR"
cp -R src/public/css "$TMP_DIR"
cp -R src/public/fonts "$TMP_DIR"
cp -R src/public/images "$TMP_DIR"
cp -R src/public/js "$TMP_DIR"
rm -fr "$TMP_DIR"/js/istanbul
rm "$TMP_DIR"/js/Makefile
rm "$TMP_DIR"/js/.eslintrc.json
cp -R src/public/node_modules "$TMP_DIR"
cp -R src/public/plugins "$TMP_DIR"
cp -R src/public/templates "$TMP_DIR"
cp -R src/public/utilities "$TMP_DIR"
cp -R src/public/vendor "$TMP_DIR"

cp src/public/composer.json "$TMP_DIR"
cp src/public/composer.lock "$TMP_DIR"
cp src/public/config.sample.php "$TMP_DIR"
cp src/public/index.php "$TMP_DIR"
cp src/public/package.json "$TMP_DIR"
cp src/public/setup.php "$TMP_DIR"
cp src/public/version.php "$TMP_DIR"

mkdir "$TMP_DIR"/downloads/pdf

cd "$TMP" || exit

tar cfz "$TAR_NAME" "$DIST_NAME"
rm -fr "$DIST_NAME"
mv "$TAR_NAME" "$CUR_DIR"/$DIST_DIR/

cd "$CUR_DIR" || exit
