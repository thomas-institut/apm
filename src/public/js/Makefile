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

# Typescript sources to be converted to JS
TS_FILES=\
	OptionsChecker.ts

# Some parameters
TSC=tsc
TSC_OPTIONS=--target ES6
NYC=nyc

all:
	@echo "Please use make test or make run"

test: $(addprefix $(ISTANBUL_DIR)/,$(TEST_JS))

TS_FILE_JS=$(addsuffix .js,$(basename $(TS_FILES)))

run: $(TS_FILE_JS)

$(ISTANBUL_DIR)/%.js : %.js
	$(NYC) instrument $< $(ISTANBUL_DIR)

%.js: %.ts
	$(TSC) $(TSC_OPTIONS) $<
