/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./DocPage.js":
/*!********************!*\
  !*** ./DocPage.js ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DocPage": () => (/* binding */ DocPage)
/* harmony export */ });
/* harmony import */ var _thomas_inst_optionschecker__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @thomas-inst/optionschecker */ "../node_modules/@thomas-inst/optionschecker/OptionsChecker.js");
/*
 *  Copyright (C) 2020 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */



class DocPage {
  constructor(pages, chunkInfo, versionInfo, lastSaves, works, authors, docId, urlGenerator) {
    this.chunkInfo = chunkInfo;
    this.docId = docId;
    this.works = works;
    this.urlGenerator = urlGenerator;
    this.pages = pages;
    this.versionInfo = versionInfo;
    this.authors = authors;
    this.lastSaves = lastSaves;

    let oc = new _thomas_inst_optionschecker__WEBPACK_IMPORTED_MODULE_0__.OptionsChecker({}, 'test')
  }
  genWorkInfoHtml() {
    if (Object.keys(this.chunkInfo).length === 0) {
      return '<ul>No chunk start/end marks found</ul>';
    }
    let html = '<ul>';
    let works = this.works;
    let chunkInfo = this.chunkInfo;
    let urlGenerator = this.urlGenerator;
    let docId = this.docId;
    for (const work in this.chunkInfo) {
      if (!this.chunkInfo.hasOwnProperty(work)) {
        continue;
      }
      html += '<li>' + works[work]['author_name'] + ', <em>' + works[work]['title'] + '</em> (' + work + ')';
      html += '<ul><li>';
      let chunksPerLine = 5;
      let tdArray = [];
      for (const chunkNumber in chunkInfo[work]) {
        if (!chunkInfo[work].hasOwnProperty(chunkNumber)) {
          continue;
        }
        let tdHtml = '';
        tdHtml += this.getChunkLabelHtml(work, chunkNumber) + ': ';
        let segmentArray = [];
        for (const segmentNumber in chunkInfo[work][chunkNumber]) {
          if (!chunkInfo[work][chunkNumber].hasOwnProperty(segmentNumber)) {
            continue;
          }
          let segmentHtml = '';
          let segmentInfo = chunkInfo[work][chunkNumber][segmentNumber];
          let startLabel = segmentInfo['start'] === '' ? '???' : this.getPageLink(segmentInfo['start']);
          let endLabel = segmentInfo['end'] === '' ? '???' : this.getPageLink(segmentInfo['end']);
          segmentHtml += startLabel + ' &ndash; ' + endLabel;
          if (!segmentInfo['valid']) {
            segmentHtml += ' <a href="#" title="' + segmentInfo['errorMsg'] + '">*</a>';
          }
          segmentArray.push({ seg: segmentNumber, html: segmentHtml });
        }
        if (segmentArray.length > 1) {
          tdHtml += '<small>' + segmentArray.length + ' segments <br/>';
          for (const i in segmentArray) {
            tdHtml += '&nbsp;&nbsp;' + segmentArray[i].seg + ': ' + segmentArray[i].html + '<br/>';
          }
        }
        else {
          tdHtml += '<small>' + segmentArray[0].html;
        }
        tdHtml += '&nbsp;';
        tdHtml += this.getChunkLink(work, chunkNumber);
        tdHtml += '</small>';
        tdArray.push(tdHtml);
      }
      // @ts-ignore
      html += ApmUtil.getTable(tdArray, 5, 'chunktable');
      html += '</ul>';
    }
    return html;
  }
  getPageTableHtml() {
    let pagesPerRow = 10;
    // @ts-ignore
    if (Object.keys(this.pages).length > 200) {
      pagesPerRow = 25;
    }
    // @ts-ignore
    return ApmUtil.getPageTable(this.docId, this.pages, pagesPerRow, this.urlGenerator);
  }
  getChunkLabelHtml(work, chunk) {
    let dataContent = '';
    if (!this.isChunkValid(work, chunk)) {
      dataContent = 'Not defined correctly';
    }
    else {
      // @ts-ignore
      let formattedTime = ApmUtil.formatVersionTime(this.versionInfo[work][chunk].timeFrom);
      let authorName = '';
      if (this.versionInfo[work][chunk].authorId !== 0) {
        authorName = this.authors[this.versionInfo[work][chunk].authorId].fullname;
      }
      dataContent = '<b>Last change:</b><br/>' + formattedTime + '<br/>' + authorName;
    }
    return '<a class="alwaysblack" href="#" data-toggle="popover" title="' +
      work + '-' + chunk +
      '" data-content="' +
      dataContent +
      '">' +
      chunk +
      '</a>';
  }
  isChunkValid(work, chunk) {
    for (const segmentNumber in this.chunkInfo[work][chunk]) {
      if (!this.chunkInfo[work][chunk][segmentNumber].valid) {
        return false;
      }
    }
    return true;
  }
  getChunkLink(work, chunk) {
    let icon = '<span class="glyphicon glyphicon-new-window"></span>';
    // @ts-ignore
    return '<a href="' + this.urlGenerator.siteChunkPage(work, chunk) + '" target="_blank" title="Open chunk page ' +
      work + '-' + chunk + ' in new tab">' +
      icon + '</a>';
  }
  getAuthorLink(authorId) {
    if (authorId == 0) {
      return 'n/a';
    }
    // @ts-ignore
    let url = this.urlGenerator.siteUserProfile(this.authors[authorId].username);
    return '<a href="' + url + '" title="View user profile" target="_blank">' + this.authors[authorId].fullname + '</a>';
  }
  getLastSavesHtml() {
    let html = '<ol>';
    for (const i in this.lastSaves) {
      let versionInfo = this.lastSaves[i];
      // @ts-ignore
      let formattedTime = ApmUtil.formatVersionTime(versionInfo.timeFrom);
      let authorLink = this.getAuthorLink(versionInfo.authorId);
      html += '<li> Page ' + this.getPageLink2(versionInfo.pageId, versionInfo.column) + ', ' +
        formattedTime + ' by ' + authorLink + '</li>';
    }
    html += '</ol>';
    return html;
  }
  getPageLink(segmentInfo) {
    let foliation = segmentInfo['foliation'];
    let pageSeq = segmentInfo['seq'];
    let title = 'View Page ' + segmentInfo['foliation'] + ' in new tab';
    let label = foliation;
    // @ts-ignore
    let url = this.urlGenerator.sitePageView(this.docId, pageSeq);
    if (segmentInfo['numColumns'] > 1) {
      title = 'View Page ' + segmentInfo['foliation'] + ' column ' + segmentInfo['column'] + ' in new tab';
      // @ts-ignore
      url = this.urlGenerator.sitePageView(this.docId, pageSeq, segmentInfo['column']);
      label += ' c' + segmentInfo['column'];
    }
    // @ts-ignore
    return '<a href="' + url + '" target="_blank" title="' + title + '">' + label + '</a>';
  }
  getPageLink2(pageId, col) {
    let pageInfo = this.pages[pageId];
    let foliation = pageInfo.foliation;
    let pageSeq = pageInfo.seq;
    let title = 'View Page ' + foliation + ' in new tab';
    let label = foliation;
    // @ts-ignore
    let url = this.urlGenerator.sitePageView(this.docId, pageSeq);
    if (pageInfo.numCols > 1) {
      title = 'View Page ' + foliation + ' col ' + col + ' in new tab';
      // @ts-ignore
      url = this.urlGenerator.sitePageView(this.docId, pageSeq, col);
      label += ' c' + col;
    }
    // @ts-ignore
    return '<a href="' + url + '" target="_blank" title="' + title + '">' + label + '</a>';
  }
}


/***/ }),

/***/ "./DocPageLoader.js":
/*!**************************!*\
  !*** ./DocPageLoader.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _DocPage__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./DocPage */ "./DocPage.js");
// Loads the DocPage class into a global variable so that it can be accessed
// from an inline script in a twig-based dynamic page

window.DocPage = _DocPage__WEBPACK_IMPORTED_MODULE_0__.DocPage




/***/ }),

/***/ "../node_modules/@thomas-inst/optionschecker/OptionsChecker.js":
/*!*********************************************************************!*\
  !*** ../node_modules/@thomas-inst/optionschecker/OptionsChecker.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "OptionsChecker": () => (/* binding */ OptionsChecker)
/* harmony export */ });
/*
 *  Copyright (C) 2019-2020 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */
/**
 * Utility class to check and generate a "clean"  options object
 *
 * The optionsDefinition object passed to the  constructor should have as properties the
 * definition of each option to be checked. Each property, in turn, has the following
 * properties:
 *
 *   optionName:  {
 *     required: <true/false>  // optional, if not present it defaults to false (i.e., the option is not required)
 *     default:  <default Value> // if required===true, the default value will be ignored
 *     type: 'type_string'   // optional type requirement for the option
 *         type_string can be a Javascript type name:  'string', 'number', 'object', 'boolean', 'function'
 *         it can also be one of the following:
 *             'NonEmptyString'
 *             'NumberGreaterThanZero'
 *             'NonZeroNumber'
 *             'Array'
 *
 *     objectClass: SomeClass // if present and type==='object', the given value is checked to be a instance of this class
 *     checker: function (v) { .... }  // optional function that performs additional checks on the given value
 *     checkDescription:  <string description of additional check asdf
 *   }
 */
class OptionsChecker {
    constructor(optionsDefinition, contextStr) {
        this.optionsDefinition = optionsDefinition;
        this.contextStr = contextStr;
    }
    isOfType(value, type) {
        switch (type) {
            case 'string':
            case 'number':
            case 'object':
            case 'boolean':
            case 'function':
                // normal javascript type
                return (typeof (value) === type);
            case 'NonEmptyString':
                return typeof (value) === 'string' && value !== '';
            case 'NumberGreaterThanZero':
                return typeof (value) === 'number' && value > 0;

            case 'NonZeroNumber':
                return typeof (value) === 'number' && value !== 0;

            case 'Array':
            case 'array':
                return Array.isArray(value);
            default:
                this.error(`Unsupported type '${type}' found in options definition`);
        }
    }

    isUndefined(value) {
        return typeof (value) === 'undefined';
    }

    getCleanOptions(optionsObject) {
        let cleanOptions = {};
        for (const optionName in this.optionsDefinition) {
            if (!this.optionsDefinition.hasOwnProperty(optionName)) {
                continue;
            }
            let optionDefinition = this.optionsDefinition[optionName];
            if (this.isUndefined(optionsObject[optionName])) {
                // optionName is NOT  in optionsObject
                if (optionDefinition.required) {
                    this.error(`Required option '${optionName}' not found`);
                }
                if (this.isUndefined(optionDefinition.default)) {
                    this.error(`No default defined for option '${optionName}'`);
                }
                cleanOptions[optionName] = optionDefinition.default;
                continue;
            }
            // optionName is present in optionsObject
            let typeOK = true;
            let additionalCheckOk = true;
            // first, check just for the given type
            if (this.isOfType(optionDefinition.type, 'NonEmptyString') &&
                !this.isOfType(optionsObject[optionName], optionDefinition.type)) {
                this.warn(`${optionName} must be ${optionDefinition.type}, ` +
                    `${this.toNiceString(optionsObject[optionName])} given, will assign default`);
                typeOK = false;
            }
            // if we have an objectClass, check for it
            if (typeOK && optionDefinition.type === 'object' && !this.isUndefined(optionDefinition.objectClass)) {
                if (!(optionsObject[optionName] instanceof optionDefinition.objectClass)) {
                    this.warn(`${optionName} must be an object of class ${optionDefinition.objectClass.name},` +
                        ` ${optionsObject[optionName].constructor.name} given, will assign default`);
                    typeOK = false;
                }
            }
            if (this.isOfType(optionDefinition.checker, 'function') &&
                !optionDefinition.checker(optionsObject[optionName])) {
                this.warn(`${optionName} must be ${optionDefinition.checkDescription}, ` +
                    `${this.toNiceString(optionsObject[optionName])} given, will assign default`);
                additionalCheckOk = false;
            }
            if (typeOK && additionalCheckOk) {
                cleanOptions[optionName] = optionsObject[optionName];
            }
            else {
                if (this.isUndefined(optionDefinition.default)) {
                    this.error(`Given ${optionName} is not valid, but there is no default value defined`);
                }
                else {
                    cleanOptions[optionName] = optionDefinition.default;
                }
            }
        }
        return cleanOptions;
    }
    getDefaults() {
        return this.getCleanOptions({});
    }
    errorMessage(msg) {
        return `${this.contextStr}: ${msg}`;
    }
    error(message) {
        console.error(this.errorMessage(message));
        throw this.errorMessage(message);
    }
    warn(message) {
        console.warn(this.errorMessage(message));
    }
    toNiceString(value) {
        switch (typeof (value)) {
            case 'string':
                return `'${value}'`;
            case 'object':
                if (Array.isArray(value)) {
                    return `[Array]`;
                }
                if (value.constructor.name !== 'Object') {
                    return `[${value.constructor.name}]`;
                }
                return '[Object]';
            default:
                return `${value}`;
        }
    }
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__("./DocPageLoader.js");
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9Eb2NQYWdlLmpzIiwid2VicGFjazovLy8uL0RvY1BhZ2VMb2FkZXIuanMiLCJ3ZWJwYWNrOi8vLy4uL25vZGVfbW9kdWxlcy9AdGhvbWFzLWluc3Qvb3B0aW9uc2NoZWNrZXIvT3B0aW9uc0NoZWNrZXIuanMiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovLy93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svc3RhcnR1cCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRTBEOztBQUVuRDtBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxpQkFBaUIsdUVBQWMsR0FBRztBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQ0FBK0M7QUFDL0M7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCLHdDQUF3QztBQUNyRTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QixNQUFNO0FBQ25DO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7O0FDL0xBO0FBQ0E7QUFDaUM7QUFDakMsaUJBQWlCLDZDQUFPOzs7Ozs7Ozs7Ozs7Ozs7OztBQ0h4QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhCQUE4QixPQUFPO0FBQ3JDO0FBQ0E7QUFDQTtBQUNPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0RBQWdELEtBQUs7QUFDckQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtREFBbUQsV0FBVztBQUM5RDtBQUNBO0FBQ0EsaUVBQWlFLFdBQVc7QUFDNUU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkIsV0FBVyxXQUFXLHNCQUFzQjtBQUN6RSx1QkFBdUIsNkNBQTZDO0FBQ3BFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQ0FBaUMsV0FBVyw4QkFBOEIsa0NBQWtDO0FBQzVHLDRCQUE0QiwyQ0FBMkM7QUFDdkU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QixXQUFXLFdBQVcsa0NBQWtDO0FBQ3JGLHVCQUF1Qiw2Q0FBNkM7QUFDcEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3Q0FBd0MsV0FBVztBQUNuRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxzQ0FBc0M7QUFDdEM7QUFDQTtBQUNBLGtCQUFrQixnQkFBZ0IsSUFBSSxJQUFJO0FBQzFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkIsTUFBTTtBQUNqQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCLHVCQUF1QjtBQUN0RDtBQUNBO0FBQ0E7QUFDQSwwQkFBMEIsTUFBTTtBQUNoQztBQUNBO0FBQ0E7Ozs7Ozs7VUMvSkE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7O1dDckJBO1dBQ0E7V0FDQTtXQUNBO1dBQ0Esd0NBQXdDLHlDQUF5QztXQUNqRjtXQUNBO1dBQ0EsRTs7Ozs7V0NQQSx3Rjs7Ozs7V0NBQTtXQUNBO1dBQ0E7V0FDQSxzREFBc0Qsa0JBQWtCO1dBQ3hFO1dBQ0EsK0NBQStDLGNBQWM7V0FDN0QsRTs7OztVQ05BO1VBQ0E7VUFDQTtVQUNBIiwiZmlsZSI6IkRvY1BhZ2UuYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqICBDb3B5cmlnaHQgKEMpIDIwMjAgVW5pdmVyc2l0w6R0IHp1IEvDtmxuXG4gKlxuICogIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiAgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiAgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uICBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICpcbiAqL1xuXG5pbXBvcnQge09wdGlvbnNDaGVja2VyfSBmcm9tICdAdGhvbWFzLWluc3Qvb3B0aW9uc2NoZWNrZXInXG5cbmV4cG9ydCBjbGFzcyBEb2NQYWdlIHtcbiAgY29uc3RydWN0b3IocGFnZXMsIGNodW5rSW5mbywgdmVyc2lvbkluZm8sIGxhc3RTYXZlcywgd29ya3MsIGF1dGhvcnMsIGRvY0lkLCB1cmxHZW5lcmF0b3IpIHtcbiAgICB0aGlzLmNodW5rSW5mbyA9IGNodW5rSW5mbztcbiAgICB0aGlzLmRvY0lkID0gZG9jSWQ7XG4gICAgdGhpcy53b3JrcyA9IHdvcmtzO1xuICAgIHRoaXMudXJsR2VuZXJhdG9yID0gdXJsR2VuZXJhdG9yO1xuICAgIHRoaXMucGFnZXMgPSBwYWdlcztcbiAgICB0aGlzLnZlcnNpb25JbmZvID0gdmVyc2lvbkluZm87XG4gICAgdGhpcy5hdXRob3JzID0gYXV0aG9ycztcbiAgICB0aGlzLmxhc3RTYXZlcyA9IGxhc3RTYXZlcztcblxuICAgIGxldCBvYyA9IG5ldyBPcHRpb25zQ2hlY2tlcih7fSwgJ3Rlc3QnKVxuICB9XG4gIGdlbldvcmtJbmZvSHRtbCgpIHtcbiAgICBpZiAoT2JqZWN0LmtleXModGhpcy5jaHVua0luZm8pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuICc8dWw+Tm8gY2h1bmsgc3RhcnQvZW5kIG1hcmtzIGZvdW5kPC91bD4nO1xuICAgIH1cbiAgICBsZXQgaHRtbCA9ICc8dWw+JztcbiAgICBsZXQgd29ya3MgPSB0aGlzLndvcmtzO1xuICAgIGxldCBjaHVua0luZm8gPSB0aGlzLmNodW5rSW5mbztcbiAgICBsZXQgdXJsR2VuZXJhdG9yID0gdGhpcy51cmxHZW5lcmF0b3I7XG4gICAgbGV0IGRvY0lkID0gdGhpcy5kb2NJZDtcbiAgICBmb3IgKGNvbnN0IHdvcmsgaW4gdGhpcy5jaHVua0luZm8pIHtcbiAgICAgIGlmICghdGhpcy5jaHVua0luZm8uaGFzT3duUHJvcGVydHkod29yaykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBodG1sICs9ICc8bGk+JyArIHdvcmtzW3dvcmtdWydhdXRob3JfbmFtZSddICsgJywgPGVtPicgKyB3b3Jrc1t3b3JrXVsndGl0bGUnXSArICc8L2VtPiAoJyArIHdvcmsgKyAnKSc7XG4gICAgICBodG1sICs9ICc8dWw+PGxpPic7XG4gICAgICBsZXQgY2h1bmtzUGVyTGluZSA9IDU7XG4gICAgICBsZXQgdGRBcnJheSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBjaHVua051bWJlciBpbiBjaHVua0luZm9bd29ya10pIHtcbiAgICAgICAgaWYgKCFjaHVua0luZm9bd29ya10uaGFzT3duUHJvcGVydHkoY2h1bmtOdW1iZXIpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHRkSHRtbCA9ICcnO1xuICAgICAgICB0ZEh0bWwgKz0gdGhpcy5nZXRDaHVua0xhYmVsSHRtbCh3b3JrLCBjaHVua051bWJlcikgKyAnOiAnO1xuICAgICAgICBsZXQgc2VnbWVudEFycmF5ID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc2VnbWVudE51bWJlciBpbiBjaHVua0luZm9bd29ya11bY2h1bmtOdW1iZXJdKSB7XG4gICAgICAgICAgaWYgKCFjaHVua0luZm9bd29ya11bY2h1bmtOdW1iZXJdLmhhc093blByb3BlcnR5KHNlZ21lbnROdW1iZXIpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGV0IHNlZ21lbnRIdG1sID0gJyc7XG4gICAgICAgICAgbGV0IHNlZ21lbnRJbmZvID0gY2h1bmtJbmZvW3dvcmtdW2NodW5rTnVtYmVyXVtzZWdtZW50TnVtYmVyXTtcbiAgICAgICAgICBsZXQgc3RhcnRMYWJlbCA9IHNlZ21lbnRJbmZvWydzdGFydCddID09PSAnJyA/ICc/Pz8nIDogdGhpcy5nZXRQYWdlTGluayhzZWdtZW50SW5mb1snc3RhcnQnXSk7XG4gICAgICAgICAgbGV0IGVuZExhYmVsID0gc2VnbWVudEluZm9bJ2VuZCddID09PSAnJyA/ICc/Pz8nIDogdGhpcy5nZXRQYWdlTGluayhzZWdtZW50SW5mb1snZW5kJ10pO1xuICAgICAgICAgIHNlZ21lbnRIdG1sICs9IHN0YXJ0TGFiZWwgKyAnICZuZGFzaDsgJyArIGVuZExhYmVsO1xuICAgICAgICAgIGlmICghc2VnbWVudEluZm9bJ3ZhbGlkJ10pIHtcbiAgICAgICAgICAgIHNlZ21lbnRIdG1sICs9ICcgPGEgaHJlZj1cIiNcIiB0aXRsZT1cIicgKyBzZWdtZW50SW5mb1snZXJyb3JNc2cnXSArICdcIj4qPC9hPic7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlZ21lbnRBcnJheS5wdXNoKHsgc2VnOiBzZWdtZW50TnVtYmVyLCBodG1sOiBzZWdtZW50SHRtbCB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VnbWVudEFycmF5Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICB0ZEh0bWwgKz0gJzxzbWFsbD4nICsgc2VnbWVudEFycmF5Lmxlbmd0aCArICcgc2VnbWVudHMgPGJyLz4nO1xuICAgICAgICAgIGZvciAoY29uc3QgaSBpbiBzZWdtZW50QXJyYXkpIHtcbiAgICAgICAgICAgIHRkSHRtbCArPSAnJm5ic3A7Jm5ic3A7JyArIHNlZ21lbnRBcnJheVtpXS5zZWcgKyAnOiAnICsgc2VnbWVudEFycmF5W2ldLmh0bWwgKyAnPGJyLz4nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0ZEh0bWwgKz0gJzxzbWFsbD4nICsgc2VnbWVudEFycmF5WzBdLmh0bWw7XG4gICAgICAgIH1cbiAgICAgICAgdGRIdG1sICs9ICcmbmJzcDsnO1xuICAgICAgICB0ZEh0bWwgKz0gdGhpcy5nZXRDaHVua0xpbmsod29yaywgY2h1bmtOdW1iZXIpO1xuICAgICAgICB0ZEh0bWwgKz0gJzwvc21hbGw+JztcbiAgICAgICAgdGRBcnJheS5wdXNoKHRkSHRtbCk7XG4gICAgICB9XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBodG1sICs9IEFwbVV0aWwuZ2V0VGFibGUodGRBcnJheSwgNSwgJ2NodW5rdGFibGUnKTtcbiAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICB9XG4gICAgcmV0dXJuIGh0bWw7XG4gIH1cbiAgZ2V0UGFnZVRhYmxlSHRtbCgpIHtcbiAgICBsZXQgcGFnZXNQZXJSb3cgPSAxMDtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgaWYgKE9iamVjdC5rZXlzKHRoaXMucGFnZXMpLmxlbmd0aCA+IDIwMCkge1xuICAgICAgcGFnZXNQZXJSb3cgPSAyNTtcbiAgICB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHJldHVybiBBcG1VdGlsLmdldFBhZ2VUYWJsZSh0aGlzLmRvY0lkLCB0aGlzLnBhZ2VzLCBwYWdlc1BlclJvdywgdGhpcy51cmxHZW5lcmF0b3IpO1xuICB9XG4gIGdldENodW5rTGFiZWxIdG1sKHdvcmssIGNodW5rKSB7XG4gICAgbGV0IGRhdGFDb250ZW50ID0gJyc7XG4gICAgaWYgKCF0aGlzLmlzQ2h1bmtWYWxpZCh3b3JrLCBjaHVuaykpIHtcbiAgICAgIGRhdGFDb250ZW50ID0gJ05vdCBkZWZpbmVkIGNvcnJlY3RseSc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgbGV0IGZvcm1hdHRlZFRpbWUgPSBBcG1VdGlsLmZvcm1hdFZlcnNpb25UaW1lKHRoaXMudmVyc2lvbkluZm9bd29ya11bY2h1bmtdLnRpbWVGcm9tKTtcbiAgICAgIGxldCBhdXRob3JOYW1lID0gJyc7XG4gICAgICBpZiAodGhpcy52ZXJzaW9uSW5mb1t3b3JrXVtjaHVua10uYXV0aG9ySWQgIT09IDApIHtcbiAgICAgICAgYXV0aG9yTmFtZSA9IHRoaXMuYXV0aG9yc1t0aGlzLnZlcnNpb25JbmZvW3dvcmtdW2NodW5rXS5hdXRob3JJZF0uZnVsbG5hbWU7XG4gICAgICB9XG4gICAgICBkYXRhQ29udGVudCA9ICc8Yj5MYXN0IGNoYW5nZTo8L2I+PGJyLz4nICsgZm9ybWF0dGVkVGltZSArICc8YnIvPicgKyBhdXRob3JOYW1lO1xuICAgIH1cbiAgICByZXR1cm4gJzxhIGNsYXNzPVwiYWx3YXlzYmxhY2tcIiBocmVmPVwiI1wiIGRhdGEtdG9nZ2xlPVwicG9wb3ZlclwiIHRpdGxlPVwiJyArXG4gICAgICB3b3JrICsgJy0nICsgY2h1bmsgK1xuICAgICAgJ1wiIGRhdGEtY29udGVudD1cIicgK1xuICAgICAgZGF0YUNvbnRlbnQgK1xuICAgICAgJ1wiPicgK1xuICAgICAgY2h1bmsgK1xuICAgICAgJzwvYT4nO1xuICB9XG4gIGlzQ2h1bmtWYWxpZCh3b3JrLCBjaHVuaykge1xuICAgIGZvciAoY29uc3Qgc2VnbWVudE51bWJlciBpbiB0aGlzLmNodW5rSW5mb1t3b3JrXVtjaHVua10pIHtcbiAgICAgIGlmICghdGhpcy5jaHVua0luZm9bd29ya11bY2h1bmtdW3NlZ21lbnROdW1iZXJdLnZhbGlkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZ2V0Q2h1bmtMaW5rKHdvcmssIGNodW5rKSB7XG4gICAgbGV0IGljb24gPSAnPHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLW5ldy13aW5kb3dcIj48L3NwYW4+JztcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcmV0dXJuICc8YSBocmVmPVwiJyArIHRoaXMudXJsR2VuZXJhdG9yLnNpdGVDaHVua1BhZ2Uod29yaywgY2h1bmspICsgJ1wiIHRhcmdldD1cIl9ibGFua1wiIHRpdGxlPVwiT3BlbiBjaHVuayBwYWdlICcgK1xuICAgICAgd29yayArICctJyArIGNodW5rICsgJyBpbiBuZXcgdGFiXCI+JyArXG4gICAgICBpY29uICsgJzwvYT4nO1xuICB9XG4gIGdldEF1dGhvckxpbmsoYXV0aG9ySWQpIHtcbiAgICBpZiAoYXV0aG9ySWQgPT0gMCkge1xuICAgICAgcmV0dXJuICduL2EnO1xuICAgIH1cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgbGV0IHVybCA9IHRoaXMudXJsR2VuZXJhdG9yLnNpdGVVc2VyUHJvZmlsZSh0aGlzLmF1dGhvcnNbYXV0aG9ySWRdLnVzZXJuYW1lKTtcbiAgICByZXR1cm4gJzxhIGhyZWY9XCInICsgdXJsICsgJ1wiIHRpdGxlPVwiVmlldyB1c2VyIHByb2ZpbGVcIiB0YXJnZXQ9XCJfYmxhbmtcIj4nICsgdGhpcy5hdXRob3JzW2F1dGhvcklkXS5mdWxsbmFtZSArICc8L2E+JztcbiAgfVxuICBnZXRMYXN0U2F2ZXNIdG1sKCkge1xuICAgIGxldCBodG1sID0gJzxvbD4nO1xuICAgIGZvciAoY29uc3QgaSBpbiB0aGlzLmxhc3RTYXZlcykge1xuICAgICAgbGV0IHZlcnNpb25JbmZvID0gdGhpcy5sYXN0U2F2ZXNbaV07XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBsZXQgZm9ybWF0dGVkVGltZSA9IEFwbVV0aWwuZm9ybWF0VmVyc2lvblRpbWUodmVyc2lvbkluZm8udGltZUZyb20pO1xuICAgICAgbGV0IGF1dGhvckxpbmsgPSB0aGlzLmdldEF1dGhvckxpbmsodmVyc2lvbkluZm8uYXV0aG9ySWQpO1xuICAgICAgaHRtbCArPSAnPGxpPiBQYWdlICcgKyB0aGlzLmdldFBhZ2VMaW5rMih2ZXJzaW9uSW5mby5wYWdlSWQsIHZlcnNpb25JbmZvLmNvbHVtbikgKyAnLCAnICtcbiAgICAgICAgZm9ybWF0dGVkVGltZSArICcgYnkgJyArIGF1dGhvckxpbmsgKyAnPC9saT4nO1xuICAgIH1cbiAgICBodG1sICs9ICc8L29sPic7XG4gICAgcmV0dXJuIGh0bWw7XG4gIH1cbiAgZ2V0UGFnZUxpbmsoc2VnbWVudEluZm8pIHtcbiAgICBsZXQgZm9saWF0aW9uID0gc2VnbWVudEluZm9bJ2ZvbGlhdGlvbiddO1xuICAgIGxldCBwYWdlU2VxID0gc2VnbWVudEluZm9bJ3NlcSddO1xuICAgIGxldCB0aXRsZSA9ICdWaWV3IFBhZ2UgJyArIHNlZ21lbnRJbmZvWydmb2xpYXRpb24nXSArICcgaW4gbmV3IHRhYic7XG4gICAgbGV0IGxhYmVsID0gZm9saWF0aW9uO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBsZXQgdXJsID0gdGhpcy51cmxHZW5lcmF0b3Iuc2l0ZVBhZ2VWaWV3KHRoaXMuZG9jSWQsIHBhZ2VTZXEpO1xuICAgIGlmIChzZWdtZW50SW5mb1snbnVtQ29sdW1ucyddID4gMSkge1xuICAgICAgdGl0bGUgPSAnVmlldyBQYWdlICcgKyBzZWdtZW50SW5mb1snZm9saWF0aW9uJ10gKyAnIGNvbHVtbiAnICsgc2VnbWVudEluZm9bJ2NvbHVtbiddICsgJyBpbiBuZXcgdGFiJztcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIHVybCA9IHRoaXMudXJsR2VuZXJhdG9yLnNpdGVQYWdlVmlldyh0aGlzLmRvY0lkLCBwYWdlU2VxLCBzZWdtZW50SW5mb1snY29sdW1uJ10pO1xuICAgICAgbGFiZWwgKz0gJyBjJyArIHNlZ21lbnRJbmZvWydjb2x1bW4nXTtcbiAgICB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyB1cmwgKyAnXCIgdGFyZ2V0PVwiX2JsYW5rXCIgdGl0bGU9XCInICsgdGl0bGUgKyAnXCI+JyArIGxhYmVsICsgJzwvYT4nO1xuICB9XG4gIGdldFBhZ2VMaW5rMihwYWdlSWQsIGNvbCkge1xuICAgIGxldCBwYWdlSW5mbyA9IHRoaXMucGFnZXNbcGFnZUlkXTtcbiAgICBsZXQgZm9saWF0aW9uID0gcGFnZUluZm8uZm9saWF0aW9uO1xuICAgIGxldCBwYWdlU2VxID0gcGFnZUluZm8uc2VxO1xuICAgIGxldCB0aXRsZSA9ICdWaWV3IFBhZ2UgJyArIGZvbGlhdGlvbiArICcgaW4gbmV3IHRhYic7XG4gICAgbGV0IGxhYmVsID0gZm9saWF0aW9uO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBsZXQgdXJsID0gdGhpcy51cmxHZW5lcmF0b3Iuc2l0ZVBhZ2VWaWV3KHRoaXMuZG9jSWQsIHBhZ2VTZXEpO1xuICAgIGlmIChwYWdlSW5mby5udW1Db2xzID4gMSkge1xuICAgICAgdGl0bGUgPSAnVmlldyBQYWdlICcgKyBmb2xpYXRpb24gKyAnIGNvbCAnICsgY29sICsgJyBpbiBuZXcgdGFiJztcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIHVybCA9IHRoaXMudXJsR2VuZXJhdG9yLnNpdGVQYWdlVmlldyh0aGlzLmRvY0lkLCBwYWdlU2VxLCBjb2wpO1xuICAgICAgbGFiZWwgKz0gJyBjJyArIGNvbDtcbiAgICB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyB1cmwgKyAnXCIgdGFyZ2V0PVwiX2JsYW5rXCIgdGl0bGU9XCInICsgdGl0bGUgKyAnXCI+JyArIGxhYmVsICsgJzwvYT4nO1xuICB9XG59XG4iLCIvLyBMb2FkcyB0aGUgRG9jUGFnZSBjbGFzcyBpbnRvIGEgZ2xvYmFsIHZhcmlhYmxlIHNvIHRoYXQgaXQgY2FuIGJlIGFjY2Vzc2VkXG4vLyBmcm9tIGFuIGlubGluZSBzY3JpcHQgaW4gYSB0d2lnLWJhc2VkIGR5bmFtaWMgcGFnZVxuaW1wb3J0IHtEb2NQYWdlfSBmcm9tICcuL0RvY1BhZ2UnXG53aW5kb3cuRG9jUGFnZSA9IERvY1BhZ2VcblxuXG4iLCIvKlxuICogIENvcHlyaWdodCAoQykgMjAxOS0yMDIwIFVuaXZlcnNpdMOkdCB6dSBLw7ZsblxuICpcbiAqICBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqICAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqICBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqICBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqICBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICogIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLiAgSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqXG4gKi9cbi8qKlxuICogVXRpbGl0eSBjbGFzcyB0byBjaGVjayBhbmQgZ2VuZXJhdGUgYSBcImNsZWFuXCIgIG9wdGlvbnMgb2JqZWN0XG4gKlxuICogVGhlIG9wdGlvbnNEZWZpbml0aW9uIG9iamVjdCBwYXNzZWQgdG8gdGhlICBjb25zdHJ1Y3RvciBzaG91bGQgaGF2ZSBhcyBwcm9wZXJ0aWVzIHRoZVxuICogZGVmaW5pdGlvbiBvZiBlYWNoIG9wdGlvbiB0byBiZSBjaGVja2VkLiBFYWNoIHByb3BlcnR5LCBpbiB0dXJuLCBoYXMgdGhlIGZvbGxvd2luZ1xuICogcHJvcGVydGllczpcbiAqXG4gKiAgIG9wdGlvbk5hbWU6ICB7XG4gKiAgICAgcmVxdWlyZWQ6IDx0cnVlL2ZhbHNlPiAgLy8gb3B0aW9uYWwsIGlmIG5vdCBwcmVzZW50IGl0IGRlZmF1bHRzIHRvIGZhbHNlIChpLmUuLCB0aGUgb3B0aW9uIGlzIG5vdCByZXF1aXJlZClcbiAqICAgICBkZWZhdWx0OiAgPGRlZmF1bHQgVmFsdWU+IC8vIGlmIHJlcXVpcmVkPT09dHJ1ZSwgdGhlIGRlZmF1bHQgdmFsdWUgd2lsbCBiZSBpZ25vcmVkXG4gKiAgICAgdHlwZTogJ3R5cGVfc3RyaW5nJyAgIC8vIG9wdGlvbmFsIHR5cGUgcmVxdWlyZW1lbnQgZm9yIHRoZSBvcHRpb25cbiAqICAgICAgICAgdHlwZV9zdHJpbmcgY2FuIGJlIGEgSmF2YXNjcmlwdCB0eXBlIG5hbWU6ICAnc3RyaW5nJywgJ251bWJlcicsICdvYmplY3QnLCAnYm9vbGVhbicsICdmdW5jdGlvbidcbiAqICAgICAgICAgaXQgY2FuIGFsc28gYmUgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG4gKiAgICAgICAgICAgICAnTm9uRW1wdHlTdHJpbmcnXG4gKiAgICAgICAgICAgICAnTnVtYmVyR3JlYXRlclRoYW5aZXJvJ1xuICogICAgICAgICAgICAgJ05vblplcm9OdW1iZXInXG4gKiAgICAgICAgICAgICAnQXJyYXknXG4gKlxuICogICAgIG9iamVjdENsYXNzOiBTb21lQ2xhc3MgLy8gaWYgcHJlc2VudCBhbmQgdHlwZT09PSdvYmplY3QnLCB0aGUgZ2l2ZW4gdmFsdWUgaXMgY2hlY2tlZCB0byBiZSBhIGluc3RhbmNlIG9mIHRoaXMgY2xhc3NcbiAqICAgICBjaGVja2VyOiBmdW5jdGlvbiAodikgeyAuLi4uIH0gIC8vIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgcGVyZm9ybXMgYWRkaXRpb25hbCBjaGVja3Mgb24gdGhlIGdpdmVuIHZhbHVlXG4gKiAgICAgY2hlY2tEZXNjcmlwdGlvbjogIDxzdHJpbmcgZGVzY3JpcHRpb24gb2YgYWRkaXRpb25hbCBjaGVjayBhc2RmXG4gKiAgIH1cbiAqL1xuZXhwb3J0IGNsYXNzIE9wdGlvbnNDaGVja2VyIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zRGVmaW5pdGlvbiwgY29udGV4dFN0cikge1xuICAgICAgICB0aGlzLm9wdGlvbnNEZWZpbml0aW9uID0gb3B0aW9uc0RlZmluaXRpb247XG4gICAgICAgIHRoaXMuY29udGV4dFN0ciA9IGNvbnRleHRTdHI7XG4gICAgfVxuICAgIGlzT2ZUeXBlKHZhbHVlLCB0eXBlKSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgLy8gbm9ybWFsIGphdmFzY3JpcHQgdHlwZVxuICAgICAgICAgICAgICAgIHJldHVybiAodHlwZW9mICh2YWx1ZSkgPT09IHR5cGUpO1xuICAgICAgICAgICAgY2FzZSAnTm9uRW1wdHlTdHJpbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgKHZhbHVlKSA9PT0gJ3N0cmluZycgJiYgdmFsdWUgIT09ICcnO1xuICAgICAgICAgICAgY2FzZSAnTnVtYmVyR3JlYXRlclRoYW5aZXJvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mICh2YWx1ZSkgPT09ICdudW1iZXInICYmIHZhbHVlID4gMDtcblxuICAgICAgICAgICAgY2FzZSAnTm9uWmVyb051bWJlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiAodmFsdWUpID09PSAnbnVtYmVyJyAmJiB2YWx1ZSAhPT0gMDtcblxuICAgICAgICAgICAgY2FzZSAnQXJyYXknOlxuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy5lcnJvcihgVW5zdXBwb3J0ZWQgdHlwZSAnJHt0eXBlfScgZm91bmQgaW4gb3B0aW9ucyBkZWZpbml0aW9uYCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpc1VuZGVmaW5lZCh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHlwZW9mICh2YWx1ZSkgPT09ICd1bmRlZmluZWQnO1xuICAgIH1cblxuICAgIGdldENsZWFuT3B0aW9ucyhvcHRpb25zT2JqZWN0KSB7XG4gICAgICAgIGxldCBjbGVhbk9wdGlvbnMgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBvcHRpb25OYW1lIGluIHRoaXMub3B0aW9uc0RlZmluaXRpb24pIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zRGVmaW5pdGlvbi5oYXNPd25Qcm9wZXJ0eShvcHRpb25OYW1lKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IG9wdGlvbkRlZmluaXRpb24gPSB0aGlzLm9wdGlvbnNEZWZpbml0aW9uW29wdGlvbk5hbWVdO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNVbmRlZmluZWQob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSkpIHtcbiAgICAgICAgICAgICAgICAvLyBvcHRpb25OYW1lIGlzIE5PVCAgaW4gb3B0aW9uc09iamVjdFxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25EZWZpbml0aW9uLnJlcXVpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IoYFJlcXVpcmVkIG9wdGlvbiAnJHtvcHRpb25OYW1lfScgbm90IGZvdW5kYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzVW5kZWZpbmVkKG9wdGlvbkRlZmluaXRpb24uZGVmYXVsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvcihgTm8gZGVmYXVsdCBkZWZpbmVkIGZvciBvcHRpb24gJyR7b3B0aW9uTmFtZX0nYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsZWFuT3B0aW9uc1tvcHRpb25OYW1lXSA9IG9wdGlvbkRlZmluaXRpb24uZGVmYXVsdDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG9wdGlvbk5hbWUgaXMgcHJlc2VudCBpbiBvcHRpb25zT2JqZWN0XG4gICAgICAgICAgICBsZXQgdHlwZU9LID0gdHJ1ZTtcbiAgICAgICAgICAgIGxldCBhZGRpdGlvbmFsQ2hlY2tPayA9IHRydWU7XG4gICAgICAgICAgICAvLyBmaXJzdCwgY2hlY2sganVzdCBmb3IgdGhlIGdpdmVuIHR5cGVcbiAgICAgICAgICAgIGlmICh0aGlzLmlzT2ZUeXBlKG9wdGlvbkRlZmluaXRpb24udHlwZSwgJ05vbkVtcHR5U3RyaW5nJykgJiZcbiAgICAgICAgICAgICAgICAhdGhpcy5pc09mVHlwZShvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdLCBvcHRpb25EZWZpbml0aW9uLnR5cGUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53YXJuKGAke29wdGlvbk5hbWV9IG11c3QgYmUgJHtvcHRpb25EZWZpbml0aW9uLnR5cGV9LCBgICtcbiAgICAgICAgICAgICAgICAgICAgYCR7dGhpcy50b05pY2VTdHJpbmcob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSl9IGdpdmVuLCB3aWxsIGFzc2lnbiBkZWZhdWx0YCk7XG4gICAgICAgICAgICAgICAgdHlwZU9LID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpZiB3ZSBoYXZlIGFuIG9iamVjdENsYXNzLCBjaGVjayBmb3IgaXRcbiAgICAgICAgICAgIGlmICh0eXBlT0sgJiYgb3B0aW9uRGVmaW5pdGlvbi50eXBlID09PSAnb2JqZWN0JyAmJiAhdGhpcy5pc1VuZGVmaW5lZChvcHRpb25EZWZpbml0aW9uLm9iamVjdENsYXNzKSkge1xuICAgICAgICAgICAgICAgIGlmICghKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0gaW5zdGFuY2VvZiBvcHRpb25EZWZpbml0aW9uLm9iamVjdENsYXNzKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLndhcm4oYCR7b3B0aW9uTmFtZX0gbXVzdCBiZSBhbiBvYmplY3Qgb2YgY2xhc3MgJHtvcHRpb25EZWZpbml0aW9uLm9iamVjdENsYXNzLm5hbWV9LGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgYCAke29wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0uY29uc3RydWN0b3IubmFtZX0gZ2l2ZW4sIHdpbGwgYXNzaWduIGRlZmF1bHRgKTtcbiAgICAgICAgICAgICAgICAgICAgdHlwZU9LID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuaXNPZlR5cGUob3B0aW9uRGVmaW5pdGlvbi5jaGVja2VyLCAnZnVuY3Rpb24nKSAmJlxuICAgICAgICAgICAgICAgICFvcHRpb25EZWZpbml0aW9uLmNoZWNrZXIob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLndhcm4oYCR7b3B0aW9uTmFtZX0gbXVzdCBiZSAke29wdGlvbkRlZmluaXRpb24uY2hlY2tEZXNjcmlwdGlvbn0sIGAgK1xuICAgICAgICAgICAgICAgICAgICBgJHt0aGlzLnRvTmljZVN0cmluZyhvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdKX0gZ2l2ZW4sIHdpbGwgYXNzaWduIGRlZmF1bHRgKTtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2hlY2tPayA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVPSyAmJiBhZGRpdGlvbmFsQ2hlY2tPaykge1xuICAgICAgICAgICAgICAgIGNsZWFuT3B0aW9uc1tvcHRpb25OYW1lXSA9IG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1VuZGVmaW5lZChvcHRpb25EZWZpbml0aW9uLmRlZmF1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IoYEdpdmVuICR7b3B0aW9uTmFtZX0gaXMgbm90IHZhbGlkLCBidXQgdGhlcmUgaXMgbm8gZGVmYXVsdCB2YWx1ZSBkZWZpbmVkYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjbGVhbk9wdGlvbnNbb3B0aW9uTmFtZV0gPSBvcHRpb25EZWZpbml0aW9uLmRlZmF1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbGVhbk9wdGlvbnM7XG4gICAgfVxuICAgIGdldERlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRDbGVhbk9wdGlvbnMoe30pO1xuICAgIH1cbiAgICBlcnJvck1lc3NhZ2UobXNnKSB7XG4gICAgICAgIHJldHVybiBgJHt0aGlzLmNvbnRleHRTdHJ9OiAke21zZ31gO1xuICAgIH1cbiAgICBlcnJvcihtZXNzYWdlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy5lcnJvck1lc3NhZ2UobWVzc2FnZSkpO1xuICAgICAgICB0aHJvdyB0aGlzLmVycm9yTWVzc2FnZShtZXNzYWdlKTtcbiAgICB9XG4gICAgd2FybihtZXNzYWdlKSB7XG4gICAgICAgIGNvbnNvbGUud2Fybih0aGlzLmVycm9yTWVzc2FnZShtZXNzYWdlKSk7XG4gICAgfVxuICAgIHRvTmljZVN0cmluZyh2YWx1ZSkge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiAodmFsdWUpKSB7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBgJyR7dmFsdWV9J2A7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYFtBcnJheV1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUuY29uc3RydWN0b3IubmFtZSAhPT0gJ09iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBbJHt2YWx1ZS5jb25zdHJ1Y3Rvci5uYW1lfV1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJ1tPYmplY3RdJztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke3ZhbHVlfWA7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHRpZihfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdKSB7XG5cdFx0cmV0dXJuIF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0uZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZVxuX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vRG9jUGFnZUxvYWRlci5qc1wiKTtcbi8vIFRoaXMgZW50cnkgbW9kdWxlIHVzZWQgJ2V4cG9ydHMnIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbiJdLCJzb3VyY2VSb290IjoiIn0=