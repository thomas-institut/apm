#!/bin/bash
#
# Utility script to install the current development version
# into a local (or remote) web server

LOCAL_INSTALL_DIR="$HOME/public_html/averroes"

# Files to copy to the installation directory
INSTALL_FILES_SRC="apdata.php appage.php errorcodes.php errorpage.php index.php login.php params.php webpage.php"
INSTALL_FILES_SRC_CSS="styles.css"
INSTALL_FILES_JSLIBS="jquery.js"

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


