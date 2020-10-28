#
# Makefile to generate js files for testing and js files out of typescript sources
#
# Created: 7 Oct 2019
# Author:  Rafael Nájera, <rafael.najera@uni-koeln.de>
#

ISTANBUL_DIR=istanbul

# JS files for testing
TEST_JS=\
	OptionsChecker.js \
	ApmUrlGenerator.js \
	Item.js \
	Element.js \
	TranscriptionEditor.js \
	PageRange.js \
	ApmUtil.js \
	CollationTable.js \
	ApmUrlGenerator.js \
	CollationTableFormatter.js \
	EditorData.js \
	TranscriptionEditorBlots.js


# Some parameters
NYC=nyc

all: test

test: $(addprefix $(ISTANBUL_DIR)/,$(TEST_JS))

$(ISTANBUL_DIR)/%.js : %.js
	$(NYC) instrument $< $(ISTANBUL_DIR)


