#!/bin/bash
#
# Utility to create a distribution directory and zip file

DIST_DIR="ap-v0.04"


INSTALL_FILES_SRC="apdata.php appage.php columnelement.php editorialnote.php errorcodes.php errorpage.php index.php login.php pageviewer.js pageviewer.php params.php transcriptiontext.php webpage.php"
INSTALL_FILES_SRC_CSS="styles.css pageviewer.css splitpane.css stickyfooter.css"
INSTALL_FILES_JSLIBS="jquery-3.1.1.js bootstrap.js bootstrap.css openseadragon.min.js splitpane.js"

INSTALL_FILES_IMAGES="averroes-logo-250.png averroes-logo-400.png"


rm -fr $DIST_DIR
rm -f $DIST_DIR.zip
mkdir $DIST_DIR
mkdir $DIST_DIR/images
mkdir $DIST_DIR/fonts
mkdir $DIST_DIR/css


#Move into src directory 
#echo "Moving into SRC"
cd src
cp -t ../$DIST_DIR $INSTALL_FILES_SRC
#echo ".. and into CSS" 
cd css 
cp -t ../../$DIST_DIR $INSTALL_FILES_SRC_CSS
cd ../..
#echo ".. now to JLIBS" 
cd jslibs
cp -t ../$DIST_DIR $INSTALL_FILES_JSLIBS
#echo "...Taking care of bootstrap fonts"
cp -t ../$DIST_DIR/fonts bootstrapfonts/*
cd ..
cd images
cp -t ../$DIST_DIR/images $INSTALL_FILES_IMAGES
cd ..

# Need to handle bootstrap.css in a special way
mv $DIST_DIR/bootstrap.css $DIST_DIR/css/bootstrap.css