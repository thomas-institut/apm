#!/bin/bash
#
# Utility script to install the current development version
# into a local (or remote) web server

LOCAL_INSTALL_DIR="$HOME/public_html/averroes"

# Files to copy to the installation directory
INSTALL_FILES_SRC="apdata.php appage.php columnelement.php editorialnote.php errorcodes.php errorpage.php index.php login.php pageviewer.php params.php transcriptiontext.php webpage.php"
INSTALL_FILES_SRC_CSS="styles.css normalize.css"
INSTALL_FILES_JSLIBS="jquery-3.1.1.js jquery-ui.js jquery-ui.css openseadragon.min.js"

INSTALL_FILES_IMAGES="stack_vertically.png stack_horizontally.png right-arrow-1.png left-arrow-1.png exit-1.png user.png power.png ui-icons_444444_256x240.png ui-icons_555555_256x240.png ui-icons_777620_256x240.png ui-icons_777777_256x240.png ui-icons_cc0000_256x240.png ui-icons_ffffff_256x240.png"

# The name of the configuration file in the local installation
CONFIG_FILE_INSTALL="config.php"

# The name of configuration file in the src directory is supposed to 
# be 'config.{machine-name}.php
MACHINE=$(uname -n)
CONFIG_FILE_SRC=config.$MACHINE.php

# SRC
cd src
cp -t $LOCAL_INSTALL_DIR $INSTALL_FILES_SRC
cp $CONFIG_FILE_SRC $LOCAL_INSTALL_DIR/$CONFIG_FILE_INSTALL
cd css
cp -t $LOCAL_INSTALL_DIR $INSTALL_FILES_SRC_CSS
cd ..
cd ..

# JSLIBS
cd jslibs
cp -t $LOCAL_INSTALL_DIR $INSTALL_FILES_JSLIBS
cd ..

# IMAGES  (these go under LOCAL_INSTALL_DIR/images
cd images
cp -t $LOCAL_INSTALL_DIR/images $INSTALL_FILES_IMAGES
cd ..

