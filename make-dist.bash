#!/bin/bash
#
# Utility to create a distribution directory and zip file

DIST_DIR="apm-v0.02"
DIST_CSS="css"
DIST_JSLIBS="js"
#DIST_JS="js"

INSTALL_FILES_SRC="apdata.php appage.php errorcodes.php errorpage.php index.php login.php params.php webpage.php"
INSTALL_FILES_CSS="styles.css"

rm -fr $DIST_DIR
rm -f $DIST_DIR.zip
mkdir $DIST_DIR
mkdir $DIST_DIR/$DIST_CSS
mkdir $DIST_DIR/$DIST_JSLIBS

#Move into src directory 
cd src
cp -t ../$DIST_DIR $INSTALL_FILES_SRC
cd css 
cp -t ../../$DIST_DIR/css $INSTALL_FILES_CSS
cd ../..

#Copy all in jslibs to $DIST_JSLIBS
cd jslibs
cp -R . ../$DIST_DIR/$DIST_JSLIBS

#chmod -R g-w $DIST_DIR
#zip -r $DIST_DIR.zip $DIST_DIR
