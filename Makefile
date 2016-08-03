#
# Makefile for apm project
#

LIVE_DIR = ~/public_html/apm
CONFIG_FILE = config.cordoba.php
DEV_DIR = ./dev

DISTFILES_FROMDEV = index.php apmdata.php params.php error.php webpage.php errorpage.php styles.css apmpage.php login.php jquery.js

livetesting :
	cd $(DEV_DIR); cp -t $(LIVE_DIR) $(DISTFILES_FROMDEV); cp $(CONFIG_FILE) $(LIVE_DIR)/config.php; cd ..; 

styles:
	cd $(DEV_DIR); cp -t $(LIVE_DIR) styles.css; cd ..


test :
	phpunit --include-path ./dev test
