#!/bin/bash
#
# Utility script to install the current development version
# into a local (or remote) web server

INSTALL_DIR="$HOME/public_html/averroes"
DEV_DIR="./src/public"

cp -r $DEV_DIR/* $INSTALL_DIR 

# The name of the configuration file in the local installation
#CONFIG_FILE_INSTALL="config.php"

# The name of configuration file in the src directory is supposed to 
# be 'config.{machine-name}.php
MACHINE=$(uname -n)
CONFIG_FILE_SRC=config.$MACHINE.php

cp src/$CONFIG_FILE_SRC $INSTALL_DIR/config.php
