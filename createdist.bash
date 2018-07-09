#!/bin/bash
#
#
# Creates a distribution tar file for apm 
#

USAGE="USAGE: createdist <version>"

if (("$#" != 1)) ; then
   echo $USAGE
   exit
fi

VERSION=$1
TMP=/tmp
DIST_NAME=apm-$VERSION
DIST_DIR=dist
CUR_DIR=$(pwd)
TMP_DIR=$TMP/$DIST_NAME
TAR_NAME=$DIST_NAME.tar.gz

echo Creating $TAR_NAME
mkdir $TMP_DIR
cp -R src/public/classes $TMP_DIR
cp -R src/public/collatex $TMP_DIR
cp -R src/public/css $TMP_DIR
cp -R src/public/fonts $TMP_DIR
cp -R src/public/images $TMP_DIR
cp -R src/public/js $TMP_DIR
cp -R src/public/node_modules $TMP_DIR
cp -R src/public/plugins $TMP_DIR
cp -R src/public/templates $TMP_DIR
cp -R src/public/utilities $TMP_DIR
cp -R src/public/vendor $TMP_DIR

cp src/public/composer.json $TMP_DIR
cp src/public/composer.lock $TMP_DIR
cp src/public/config.sample.php $TMP_DIR
cp src/public/index.php $TMP_DIR
cp src/public/package.json $TMP_DIR

cd $TMP
tar cfz $TAR_NAME $DIST_NAME
rm -fr $DIST_NAME
mv $TAR_NAME $CUR_DIR/$DIST_DIR/
cd $CUR_DIR





