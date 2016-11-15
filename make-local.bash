#!/bin/bash
#
# Utility script to install the current development version
# into a local (or remote) web server

LOCAL_INSTALL_DIR="$HOME/public_html/averroes"

# Files to copy to the installation directory
INSTALL_FILES_SRC="apdata.php appage.php columnelement.php editorialnote.php errorcodes.php errorpage.php index.php login.php  pageviewer.php params.php transcriptiontext.php webpage.php"
INSTALL_FILES_SRC_CSS="bootstrap.css styles.css pageviewer.css splitpane.css"
INSTALL_FILES_SRC_JS="pageviewer.js"
INSTALL_FILES_JSLIBS="jquery-3.1.1.js bootstrap.js  openseadragon.min.js splitpane.js"
INSTALL_FILES_IMAGES="averroes-logo-250.png averroes-logo-400.png"

TEST_FILES="demotest.js simple.html"

# The name of the configuration file in the local installation
CONFIG_FILE_INSTALL="config.php"

# The name of configuration file in the src directory is supposed to 
# be 'config.{machine-name}.php
MACHINE=$(uname -n)
CONFIG_FILE_SRC=config.$MACHINE.php

# Create directories if they don't exist
mkdir -p $LOCAL_INSTALL_DIR
mkdir -p $LOCAL_INSTALL_DIR/js
mkdir -p $LOCAL_INSTALL_DIR/images
mkdir -p $LOCAL_INSTALL_DIR/images/openseadragonimages
mkdir -p $LOCAL_INSTALL_DIR/fonts
mkdir -p $LOCAL_INSTALL_DIR/css


# Step into src directory
cd src
cp -t $LOCAL_INSTALL_DIR $INSTALL_FILES_SRC
cp -t $LOCAL_INSTALL_DIR/js $INSTALL_FILES_SRC_JS
cp $CONFIG_FILE_SRC $LOCAL_INSTALL_DIR/$CONFIG_FILE_INSTALL
cd css
cp -t $LOCAL_INSTALL_DIR/css $INSTALL_FILES_SRC_CSS
cd ..
cd ..

# JSLIBS
cd jslibs
cp -t $LOCAL_INSTALL_DIR/js $INSTALL_FILES_JSLIBS
cp -t $LOCAL_INSTALL_DIR/fonts bootstrapfonts/*
cp -t $LOCAL_INSTALL_DIR/images/openseadragonimages openseadragonimages/* 
cd ..

# IMAGES  (these go under LOCAL_INSTALL_DIR/images
cd images
cp -t $LOCAL_INSTALL_DIR/images $INSTALL_FILES_IMAGES
cd ..

# TESTS
#cd test
#cp -t $LOCAL_INSTALL_DIR/test $TEST_FILES