#!/bin/bash
#
# Utility to create a distribution directory and zip file

DIST_DIR="ap-v0.02"


INSTALL_FILES_SRC="apdata.php appage.php columnelement.php editorialnote.php errorcodes.php errorpage.php index.php login.php pageviewer.php params.php transcriptiontext.php webpage.php"
INSTALL_FILES_CSS="styles.css normalize.css"
INSTALL_FILES_JSLIBS="jquery-3.1.1.js jquery-ui.js jquery-ui.css openseadragon.min.js"

INSTALL_FILES_IMAGES="stack_vertically.png stack_horizontally.png right-arrow-1.png left-arrow-1.png exit-1.png user.png power.png ui-icons_444444_256x240.png ui-icons_555555_256x240.png ui-icons_777620_256x240.png ui-icons_777777_256x240.png ui-icons_cc0000_256x240.png ui-icons_ffffff_256x240.png"



rm -fr $DIST_DIR
rm -f $DIST_DIR.zip
mkdir $DIST_DIR
mkdir $DIST_DIR/images


#Move into src directory 
cd src
cp -t ../$DIST_DIR $INSTALL_FILES_SRC
cd css 
cp -t ../../$DIST_DIR $INSTALL_FILES_CSS
cd ../..
cd jslibs
cp -t ../$DIST_DIR $INSTALL_FILES_JSLIBS
cd ..
cd images
cp -t ../$DIST_DIR/images $INSTALL_FILES_IMAGES



