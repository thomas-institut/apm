/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./DocPage.js":
/*!********************!*\
  !*** ./DocPage.js ***!
  \********************/
/*! namespace exports */
/*! export DocPage [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DocPage": () => /* binding */ DocPage
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
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
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
/*! namespace exports */
/*! export OptionsChecker [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "OptionsChecker": () => /* binding */ OptionsChecker
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
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9Eb2NQYWdlLmpzIiwid2VicGFjazovLy8uL0RvY1BhZ2VMb2FkZXIuanMiLCJ3ZWJwYWNrOi8vLy4uL25vZGVfbW9kdWxlcy9AdGhvbWFzLWluc3Qvb3B0aW9uc2NoZWNrZXIvT3B0aW9uc0NoZWNrZXIuanMiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovLy93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svc3RhcnR1cCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCO0FBQzdCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUUwRDs7QUFFbkQ7QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsaUJBQWlCLHVFQUFjLEdBQUc7QUFDbEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0NBQStDO0FBQy9DO0FBQ0E7QUFDQTtBQUNBLDZCQUE2Qix3Q0FBd0M7QUFDckU7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkIsTUFBTTtBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCO0FBQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7OztBQy9MQTtBQUNBO0FBQ2lDO0FBQ2pDLGlCQUFpQiw2Q0FBTzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDSHhCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QjtBQUM3QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOEJBQThCLE9BQU87QUFDckM7QUFDQTtBQUNBO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnREFBZ0QsS0FBSztBQUNyRDtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1EQUFtRCxXQUFXO0FBQzlEO0FBQ0E7QUFDQSxpRUFBaUUsV0FBVztBQUM1RTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QixXQUFXLFdBQVcsc0JBQXNCO0FBQ3pFLHVCQUF1Qiw2Q0FBNkM7QUFDcEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlDQUFpQyxXQUFXLDhCQUE4QixrQ0FBa0M7QUFDNUcsNEJBQTRCLDJDQUEyQztBQUN2RTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCLFdBQVcsV0FBVyxrQ0FBa0M7QUFDckYsdUJBQXVCLDZDQUE2QztBQUNwRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdDQUF3QyxXQUFXO0FBQ25EO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNDQUFzQztBQUN0QztBQUNBO0FBQ0Esa0JBQWtCLGdCQUFnQixJQUFJLElBQUk7QUFDMUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJCQUEyQixNQUFNO0FBQ2pDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0IsdUJBQXVCO0FBQ3REO0FBQ0E7QUFDQTtBQUNBLDBCQUEwQixNQUFNO0FBQ2hDO0FBQ0E7QUFDQTs7Ozs7OztVQy9KQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7Ozs7V0NyQkE7V0FDQTtXQUNBO1dBQ0E7V0FDQSx3Q0FBd0MseUNBQXlDO1dBQ2pGO1dBQ0E7V0FDQSxFOzs7OztXQ1BBLHNGOzs7OztXQ0FBO1dBQ0E7V0FDQTtXQUNBLHNEQUFzRCxrQkFBa0I7V0FDeEU7V0FDQSwrQ0FBK0MsY0FBYztXQUM3RCxFOzs7O1VDTkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiRG9jUGFnZS5idW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogIENvcHlyaWdodCAoQykgMjAyMCBVbml2ZXJzaXTDpHQgenUgS8O2bG5cbiAqXG4gKiAgVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAgKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiAgVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiAgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiAgWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqICBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS4gIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKlxuICovXG5cbmltcG9ydCB7T3B0aW9uc0NoZWNrZXJ9IGZyb20gJ0B0aG9tYXMtaW5zdC9vcHRpb25zY2hlY2tlcidcblxuZXhwb3J0IGNsYXNzIERvY1BhZ2Uge1xuICBjb25zdHJ1Y3RvcihwYWdlcywgY2h1bmtJbmZvLCB2ZXJzaW9uSW5mbywgbGFzdFNhdmVzLCB3b3JrcywgYXV0aG9ycywgZG9jSWQsIHVybEdlbmVyYXRvcikge1xuICAgIHRoaXMuY2h1bmtJbmZvID0gY2h1bmtJbmZvO1xuICAgIHRoaXMuZG9jSWQgPSBkb2NJZDtcbiAgICB0aGlzLndvcmtzID0gd29ya3M7XG4gICAgdGhpcy51cmxHZW5lcmF0b3IgPSB1cmxHZW5lcmF0b3I7XG4gICAgdGhpcy5wYWdlcyA9IHBhZ2VzO1xuICAgIHRoaXMudmVyc2lvbkluZm8gPSB2ZXJzaW9uSW5mbztcbiAgICB0aGlzLmF1dGhvcnMgPSBhdXRob3JzO1xuICAgIHRoaXMubGFzdFNhdmVzID0gbGFzdFNhdmVzO1xuXG4gICAgbGV0IG9jID0gbmV3IE9wdGlvbnNDaGVja2VyKHt9LCAndGVzdCcpXG4gIH1cbiAgZ2VuV29ya0luZm9IdG1sKCkge1xuICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLmNodW5rSW5mbykubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gJzx1bD5ObyBjaHVuayBzdGFydC9lbmQgbWFya3MgZm91bmQ8L3VsPic7XG4gICAgfVxuICAgIGxldCBodG1sID0gJzx1bD4nO1xuICAgIGxldCB3b3JrcyA9IHRoaXMud29ya3M7XG4gICAgbGV0IGNodW5rSW5mbyA9IHRoaXMuY2h1bmtJbmZvO1xuICAgIGxldCB1cmxHZW5lcmF0b3IgPSB0aGlzLnVybEdlbmVyYXRvcjtcbiAgICBsZXQgZG9jSWQgPSB0aGlzLmRvY0lkO1xuICAgIGZvciAoY29uc3Qgd29yayBpbiB0aGlzLmNodW5rSW5mbykge1xuICAgICAgaWYgKCF0aGlzLmNodW5rSW5mby5oYXNPd25Qcm9wZXJ0eSh3b3JrKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGh0bWwgKz0gJzxsaT4nICsgd29ya3Nbd29ya11bJ2F1dGhvcl9uYW1lJ10gKyAnLCA8ZW0+JyArIHdvcmtzW3dvcmtdWyd0aXRsZSddICsgJzwvZW0+ICgnICsgd29yayArICcpJztcbiAgICAgIGh0bWwgKz0gJzx1bD48bGk+JztcbiAgICAgIGxldCBjaHVua3NQZXJMaW5lID0gNTtcbiAgICAgIGxldCB0ZEFycmF5ID0gW107XG4gICAgICBmb3IgKGNvbnN0IGNodW5rTnVtYmVyIGluIGNodW5rSW5mb1t3b3JrXSkge1xuICAgICAgICBpZiAoIWNodW5rSW5mb1t3b3JrXS5oYXNPd25Qcm9wZXJ0eShjaHVua051bWJlcikpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgdGRIdG1sID0gJyc7XG4gICAgICAgIHRkSHRtbCArPSB0aGlzLmdldENodW5rTGFiZWxIdG1sKHdvcmssIGNodW5rTnVtYmVyKSArICc6ICc7XG4gICAgICAgIGxldCBzZWdtZW50QXJyYXkgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzZWdtZW50TnVtYmVyIGluIGNodW5rSW5mb1t3b3JrXVtjaHVua051bWJlcl0pIHtcbiAgICAgICAgICBpZiAoIWNodW5rSW5mb1t3b3JrXVtjaHVua051bWJlcl0uaGFzT3duUHJvcGVydHkoc2VnbWVudE51bWJlcikpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsZXQgc2VnbWVudEh0bWwgPSAnJztcbiAgICAgICAgICBsZXQgc2VnbWVudEluZm8gPSBjaHVua0luZm9bd29ya11bY2h1bmtOdW1iZXJdW3NlZ21lbnROdW1iZXJdO1xuICAgICAgICAgIGxldCBzdGFydExhYmVsID0gc2VnbWVudEluZm9bJ3N0YXJ0J10gPT09ICcnID8gJz8/PycgOiB0aGlzLmdldFBhZ2VMaW5rKHNlZ21lbnRJbmZvWydzdGFydCddKTtcbiAgICAgICAgICBsZXQgZW5kTGFiZWwgPSBzZWdtZW50SW5mb1snZW5kJ10gPT09ICcnID8gJz8/PycgOiB0aGlzLmdldFBhZ2VMaW5rKHNlZ21lbnRJbmZvWydlbmQnXSk7XG4gICAgICAgICAgc2VnbWVudEh0bWwgKz0gc3RhcnRMYWJlbCArICcgJm5kYXNoOyAnICsgZW5kTGFiZWw7XG4gICAgICAgICAgaWYgKCFzZWdtZW50SW5mb1sndmFsaWQnXSkge1xuICAgICAgICAgICAgc2VnbWVudEh0bWwgKz0gJyA8YSBocmVmPVwiI1wiIHRpdGxlPVwiJyArIHNlZ21lbnRJbmZvWydlcnJvck1zZyddICsgJ1wiPio8L2E+JztcbiAgICAgICAgICB9XG4gICAgICAgICAgc2VnbWVudEFycmF5LnB1c2goeyBzZWc6IHNlZ21lbnROdW1iZXIsIGh0bWw6IHNlZ21lbnRIdG1sIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWdtZW50QXJyYXkubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHRkSHRtbCArPSAnPHNtYWxsPicgKyBzZWdtZW50QXJyYXkubGVuZ3RoICsgJyBzZWdtZW50cyA8YnIvPic7XG4gICAgICAgICAgZm9yIChjb25zdCBpIGluIHNlZ21lbnRBcnJheSkge1xuICAgICAgICAgICAgdGRIdG1sICs9ICcmbmJzcDsmbmJzcDsnICsgc2VnbWVudEFycmF5W2ldLnNlZyArICc6ICcgKyBzZWdtZW50QXJyYXlbaV0uaHRtbCArICc8YnIvPic7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRkSHRtbCArPSAnPHNtYWxsPicgKyBzZWdtZW50QXJyYXlbMF0uaHRtbDtcbiAgICAgICAgfVxuICAgICAgICB0ZEh0bWwgKz0gJyZuYnNwOyc7XG4gICAgICAgIHRkSHRtbCArPSB0aGlzLmdldENodW5rTGluayh3b3JrLCBjaHVua051bWJlcik7XG4gICAgICAgIHRkSHRtbCArPSAnPC9zbWFsbD4nO1xuICAgICAgICB0ZEFycmF5LnB1c2godGRIdG1sKTtcbiAgICAgIH1cbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIGh0bWwgKz0gQXBtVXRpbC5nZXRUYWJsZSh0ZEFycmF5LCA1LCAnY2h1bmt0YWJsZScpO1xuICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgIH1cbiAgICByZXR1cm4gaHRtbDtcbiAgfVxuICBnZXRQYWdlVGFibGVIdG1sKCkge1xuICAgIGxldCBwYWdlc1BlclJvdyA9IDEwO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBpZiAoT2JqZWN0LmtleXModGhpcy5wYWdlcykubGVuZ3RoID4gMjAwKSB7XG4gICAgICBwYWdlc1BlclJvdyA9IDI1O1xuICAgIH1cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcmV0dXJuIEFwbVV0aWwuZ2V0UGFnZVRhYmxlKHRoaXMuZG9jSWQsIHRoaXMucGFnZXMsIHBhZ2VzUGVyUm93LCB0aGlzLnVybEdlbmVyYXRvcik7XG4gIH1cbiAgZ2V0Q2h1bmtMYWJlbEh0bWwod29yaywgY2h1bmspIHtcbiAgICBsZXQgZGF0YUNvbnRlbnQgPSAnJztcbiAgICBpZiAoIXRoaXMuaXNDaHVua1ZhbGlkKHdvcmssIGNodW5rKSkge1xuICAgICAgZGF0YUNvbnRlbnQgPSAnTm90IGRlZmluZWQgY29ycmVjdGx5JztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBsZXQgZm9ybWF0dGVkVGltZSA9IEFwbVV0aWwuZm9ybWF0VmVyc2lvblRpbWUodGhpcy52ZXJzaW9uSW5mb1t3b3JrXVtjaHVua10udGltZUZyb20pO1xuICAgICAgbGV0IGF1dGhvck5hbWUgPSAnJztcbiAgICAgIGlmICh0aGlzLnZlcnNpb25JbmZvW3dvcmtdW2NodW5rXS5hdXRob3JJZCAhPT0gMCkge1xuICAgICAgICBhdXRob3JOYW1lID0gdGhpcy5hdXRob3JzW3RoaXMudmVyc2lvbkluZm9bd29ya11bY2h1bmtdLmF1dGhvcklkXS5mdWxsbmFtZTtcbiAgICAgIH1cbiAgICAgIGRhdGFDb250ZW50ID0gJzxiPkxhc3QgY2hhbmdlOjwvYj48YnIvPicgKyBmb3JtYXR0ZWRUaW1lICsgJzxici8+JyArIGF1dGhvck5hbWU7XG4gICAgfVxuICAgIHJldHVybiAnPGEgY2xhc3M9XCJhbHdheXNibGFja1wiIGhyZWY9XCIjXCIgZGF0YS10b2dnbGU9XCJwb3BvdmVyXCIgdGl0bGU9XCInICtcbiAgICAgIHdvcmsgKyAnLScgKyBjaHVuayArXG4gICAgICAnXCIgZGF0YS1jb250ZW50PVwiJyArXG4gICAgICBkYXRhQ29udGVudCArXG4gICAgICAnXCI+JyArXG4gICAgICBjaHVuayArXG4gICAgICAnPC9hPic7XG4gIH1cbiAgaXNDaHVua1ZhbGlkKHdvcmssIGNodW5rKSB7XG4gICAgZm9yIChjb25zdCBzZWdtZW50TnVtYmVyIGluIHRoaXMuY2h1bmtJbmZvW3dvcmtdW2NodW5rXSkge1xuICAgICAgaWYgKCF0aGlzLmNodW5rSW5mb1t3b3JrXVtjaHVua11bc2VnbWVudE51bWJlcl0udmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBnZXRDaHVua0xpbmsod29yaywgY2h1bmspIHtcbiAgICBsZXQgaWNvbiA9ICc8c3BhbiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tbmV3LXdpbmRvd1wiPjwvc3Bhbj4nO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICByZXR1cm4gJzxhIGhyZWY9XCInICsgdGhpcy51cmxHZW5lcmF0b3Iuc2l0ZUNodW5rUGFnZSh3b3JrLCBjaHVuaykgKyAnXCIgdGFyZ2V0PVwiX2JsYW5rXCIgdGl0bGU9XCJPcGVuIGNodW5rIHBhZ2UgJyArXG4gICAgICB3b3JrICsgJy0nICsgY2h1bmsgKyAnIGluIG5ldyB0YWJcIj4nICtcbiAgICAgIGljb24gKyAnPC9hPic7XG4gIH1cbiAgZ2V0QXV0aG9yTGluayhhdXRob3JJZCkge1xuICAgIGlmIChhdXRob3JJZCA9PSAwKSB7XG4gICAgICByZXR1cm4gJ24vYSc7XG4gICAgfVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBsZXQgdXJsID0gdGhpcy51cmxHZW5lcmF0b3Iuc2l0ZVVzZXJQcm9maWxlKHRoaXMuYXV0aG9yc1thdXRob3JJZF0udXNlcm5hbWUpO1xuICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyB1cmwgKyAnXCIgdGl0bGU9XCJWaWV3IHVzZXIgcHJvZmlsZVwiIHRhcmdldD1cIl9ibGFua1wiPicgKyB0aGlzLmF1dGhvcnNbYXV0aG9ySWRdLmZ1bGxuYW1lICsgJzwvYT4nO1xuICB9XG4gIGdldExhc3RTYXZlc0h0bWwoKSB7XG4gICAgbGV0IGh0bWwgPSAnPG9sPic7XG4gICAgZm9yIChjb25zdCBpIGluIHRoaXMubGFzdFNhdmVzKSB7XG4gICAgICBsZXQgdmVyc2lvbkluZm8gPSB0aGlzLmxhc3RTYXZlc1tpXTtcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIGxldCBmb3JtYXR0ZWRUaW1lID0gQXBtVXRpbC5mb3JtYXRWZXJzaW9uVGltZSh2ZXJzaW9uSW5mby50aW1lRnJvbSk7XG4gICAgICBsZXQgYXV0aG9yTGluayA9IHRoaXMuZ2V0QXV0aG9yTGluayh2ZXJzaW9uSW5mby5hdXRob3JJZCk7XG4gICAgICBodG1sICs9ICc8bGk+IFBhZ2UgJyArIHRoaXMuZ2V0UGFnZUxpbmsyKHZlcnNpb25JbmZvLnBhZ2VJZCwgdmVyc2lvbkluZm8uY29sdW1uKSArICcsICcgK1xuICAgICAgICBmb3JtYXR0ZWRUaW1lICsgJyBieSAnICsgYXV0aG9yTGluayArICc8L2xpPic7XG4gICAgfVxuICAgIGh0bWwgKz0gJzwvb2w+JztcbiAgICByZXR1cm4gaHRtbDtcbiAgfVxuICBnZXRQYWdlTGluayhzZWdtZW50SW5mbykge1xuICAgIGxldCBmb2xpYXRpb24gPSBzZWdtZW50SW5mb1snZm9saWF0aW9uJ107XG4gICAgbGV0IHBhZ2VTZXEgPSBzZWdtZW50SW5mb1snc2VxJ107XG4gICAgbGV0IHRpdGxlID0gJ1ZpZXcgUGFnZSAnICsgc2VnbWVudEluZm9bJ2ZvbGlhdGlvbiddICsgJyBpbiBuZXcgdGFiJztcbiAgICBsZXQgbGFiZWwgPSBmb2xpYXRpb247XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGxldCB1cmwgPSB0aGlzLnVybEdlbmVyYXRvci5zaXRlUGFnZVZpZXcodGhpcy5kb2NJZCwgcGFnZVNlcSk7XG4gICAgaWYgKHNlZ21lbnRJbmZvWydudW1Db2x1bW5zJ10gPiAxKSB7XG4gICAgICB0aXRsZSA9ICdWaWV3IFBhZ2UgJyArIHNlZ21lbnRJbmZvWydmb2xpYXRpb24nXSArICcgY29sdW1uICcgKyBzZWdtZW50SW5mb1snY29sdW1uJ10gKyAnIGluIG5ldyB0YWInO1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgdXJsID0gdGhpcy51cmxHZW5lcmF0b3Iuc2l0ZVBhZ2VWaWV3KHRoaXMuZG9jSWQsIHBhZ2VTZXEsIHNlZ21lbnRJbmZvWydjb2x1bW4nXSk7XG4gICAgICBsYWJlbCArPSAnIGMnICsgc2VnbWVudEluZm9bJ2NvbHVtbiddO1xuICAgIH1cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcmV0dXJuICc8YSBocmVmPVwiJyArIHVybCArICdcIiB0YXJnZXQ9XCJfYmxhbmtcIiB0aXRsZT1cIicgKyB0aXRsZSArICdcIj4nICsgbGFiZWwgKyAnPC9hPic7XG4gIH1cbiAgZ2V0UGFnZUxpbmsyKHBhZ2VJZCwgY29sKSB7XG4gICAgbGV0IHBhZ2VJbmZvID0gdGhpcy5wYWdlc1twYWdlSWRdO1xuICAgIGxldCBmb2xpYXRpb24gPSBwYWdlSW5mby5mb2xpYXRpb247XG4gICAgbGV0IHBhZ2VTZXEgPSBwYWdlSW5mby5zZXE7XG4gICAgbGV0IHRpdGxlID0gJ1ZpZXcgUGFnZSAnICsgZm9saWF0aW9uICsgJyBpbiBuZXcgdGFiJztcbiAgICBsZXQgbGFiZWwgPSBmb2xpYXRpb247XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGxldCB1cmwgPSB0aGlzLnVybEdlbmVyYXRvci5zaXRlUGFnZVZpZXcodGhpcy5kb2NJZCwgcGFnZVNlcSk7XG4gICAgaWYgKHBhZ2VJbmZvLm51bUNvbHMgPiAxKSB7XG4gICAgICB0aXRsZSA9ICdWaWV3IFBhZ2UgJyArIGZvbGlhdGlvbiArICcgY29sICcgKyBjb2wgKyAnIGluIG5ldyB0YWInO1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgdXJsID0gdGhpcy51cmxHZW5lcmF0b3Iuc2l0ZVBhZ2VWaWV3KHRoaXMuZG9jSWQsIHBhZ2VTZXEsIGNvbCk7XG4gICAgICBsYWJlbCArPSAnIGMnICsgY29sO1xuICAgIH1cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcmV0dXJuICc8YSBocmVmPVwiJyArIHVybCArICdcIiB0YXJnZXQ9XCJfYmxhbmtcIiB0aXRsZT1cIicgKyB0aXRsZSArICdcIj4nICsgbGFiZWwgKyAnPC9hPic7XG4gIH1cbn1cbiIsIi8vIExvYWRzIHRoZSBEb2NQYWdlIGNsYXNzIGludG8gYSBnbG9iYWwgdmFyaWFibGUgc28gdGhhdCBpdCBjYW4gYmUgYWNjZXNzZWRcbi8vIGZyb20gYW4gaW5saW5lIHNjcmlwdCBpbiBhIHR3aWctYmFzZWQgZHluYW1pYyBwYWdlXG5pbXBvcnQge0RvY1BhZ2V9IGZyb20gJy4vRG9jUGFnZSdcbndpbmRvdy5Eb2NQYWdlID0gRG9jUGFnZVxuXG5cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChDKSAyMDE5LTIwMjAgVW5pdmVyc2l0w6R0IHp1IEvDtmxuXG4gKlxuICogIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiAgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiAgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uICBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICpcbiAqL1xuLyoqXG4gKiBVdGlsaXR5IGNsYXNzIHRvIGNoZWNrIGFuZCBnZW5lcmF0ZSBhIFwiY2xlYW5cIiAgb3B0aW9ucyBvYmplY3RcbiAqXG4gKiBUaGUgb3B0aW9uc0RlZmluaXRpb24gb2JqZWN0IHBhc3NlZCB0byB0aGUgIGNvbnN0cnVjdG9yIHNob3VsZCBoYXZlIGFzIHByb3BlcnRpZXMgdGhlXG4gKiBkZWZpbml0aW9uIG9mIGVhY2ggb3B0aW9uIHRvIGJlIGNoZWNrZWQuIEVhY2ggcHJvcGVydHksIGluIHR1cm4sIGhhcyB0aGUgZm9sbG93aW5nXG4gKiBwcm9wZXJ0aWVzOlxuICpcbiAqICAgb3B0aW9uTmFtZTogIHtcbiAqICAgICByZXF1aXJlZDogPHRydWUvZmFsc2U+ICAvLyBvcHRpb25hbCwgaWYgbm90IHByZXNlbnQgaXQgZGVmYXVsdHMgdG8gZmFsc2UgKGkuZS4sIHRoZSBvcHRpb24gaXMgbm90IHJlcXVpcmVkKVxuICogICAgIGRlZmF1bHQ6ICA8ZGVmYXVsdCBWYWx1ZT4gLy8gaWYgcmVxdWlyZWQ9PT10cnVlLCB0aGUgZGVmYXVsdCB2YWx1ZSB3aWxsIGJlIGlnbm9yZWRcbiAqICAgICB0eXBlOiAndHlwZV9zdHJpbmcnICAgLy8gb3B0aW9uYWwgdHlwZSByZXF1aXJlbWVudCBmb3IgdGhlIG9wdGlvblxuICogICAgICAgICB0eXBlX3N0cmluZyBjYW4gYmUgYSBKYXZhc2NyaXB0IHR5cGUgbmFtZTogICdzdHJpbmcnLCAnbnVtYmVyJywgJ29iamVjdCcsICdib29sZWFuJywgJ2Z1bmN0aW9uJ1xuICogICAgICAgICBpdCBjYW4gYWxzbyBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbiAqICAgICAgICAgICAgICdOb25FbXB0eVN0cmluZydcbiAqICAgICAgICAgICAgICdOdW1iZXJHcmVhdGVyVGhhblplcm8nXG4gKiAgICAgICAgICAgICAnTm9uWmVyb051bWJlcidcbiAqICAgICAgICAgICAgICdBcnJheSdcbiAqXG4gKiAgICAgb2JqZWN0Q2xhc3M6IFNvbWVDbGFzcyAvLyBpZiBwcmVzZW50IGFuZCB0eXBlPT09J29iamVjdCcsIHRoZSBnaXZlbiB2YWx1ZSBpcyBjaGVja2VkIHRvIGJlIGEgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzc1xuICogICAgIGNoZWNrZXI6IGZ1bmN0aW9uICh2KSB7IC4uLi4gfSAgLy8gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCBwZXJmb3JtcyBhZGRpdGlvbmFsIGNoZWNrcyBvbiB0aGUgZ2l2ZW4gdmFsdWVcbiAqICAgICBjaGVja0Rlc2NyaXB0aW9uOiAgPHN0cmluZyBkZXNjcmlwdGlvbiBvZiBhZGRpdGlvbmFsIGNoZWNrIGFzZGZcbiAqICAgfVxuICovXG5leHBvcnQgY2xhc3MgT3B0aW9uc0NoZWNrZXIge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnNEZWZpbml0aW9uLCBjb250ZXh0U3RyKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc0RlZmluaXRpb24gPSBvcHRpb25zRGVmaW5pdGlvbjtcbiAgICAgICAgdGhpcy5jb250ZXh0U3RyID0gY29udGV4dFN0cjtcbiAgICB9XG4gICAgaXNPZlR5cGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICAvLyBub3JtYWwgamF2YXNjcmlwdCB0eXBlXG4gICAgICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgKHZhbHVlKSA9PT0gdHlwZSk7XG4gICAgICAgICAgICBjYXNlICdOb25FbXB0eVN0cmluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiAodmFsdWUpID09PSAnc3RyaW5nJyAmJiB2YWx1ZSAhPT0gJyc7XG4gICAgICAgICAgICBjYXNlICdOdW1iZXJHcmVhdGVyVGhhblplcm8nOlxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgKHZhbHVlKSA9PT0gJ251bWJlcicgJiYgdmFsdWUgPiAwO1xuXG4gICAgICAgICAgICBjYXNlICdOb25aZXJvTnVtYmVyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mICh2YWx1ZSkgPT09ICdudW1iZXInICYmIHZhbHVlICE9PSAwO1xuXG4gICAgICAgICAgICBjYXNlICdBcnJheSc6XG4gICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aGlzLmVycm9yKGBVbnN1cHBvcnRlZCB0eXBlICcke3R5cGV9JyBmb3VuZCBpbiBvcHRpb25zIGRlZmluaXRpb25gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgKHZhbHVlKSA9PT0gJ3VuZGVmaW5lZCc7XG4gICAgfVxuXG4gICAgZ2V0Q2xlYW5PcHRpb25zKG9wdGlvbnNPYmplY3QpIHtcbiAgICAgICAgbGV0IGNsZWFuT3B0aW9ucyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbk5hbWUgaW4gdGhpcy5vcHRpb25zRGVmaW5pdGlvbikge1xuICAgICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnNEZWZpbml0aW9uLmhhc093blByb3BlcnR5KG9wdGlvbk5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgb3B0aW9uRGVmaW5pdGlvbiA9IHRoaXMub3B0aW9uc0RlZmluaXRpb25bb3B0aW9uTmFtZV07XG4gICAgICAgICAgICBpZiAodGhpcy5pc1VuZGVmaW5lZChvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdKSkge1xuICAgICAgICAgICAgICAgIC8vIG9wdGlvbk5hbWUgaXMgTk9UICBpbiBvcHRpb25zT2JqZWN0XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbkRlZmluaXRpb24ucmVxdWlyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvcihgUmVxdWlyZWQgb3B0aW9uICcke29wdGlvbk5hbWV9JyBub3QgZm91bmRgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNVbmRlZmluZWQob3B0aW9uRGVmaW5pdGlvbi5kZWZhdWx0KSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVycm9yKGBObyBkZWZhdWx0IGRlZmluZWQgZm9yIG9wdGlvbiAnJHtvcHRpb25OYW1lfSdgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2xlYW5PcHRpb25zW29wdGlvbk5hbWVdID0gb3B0aW9uRGVmaW5pdGlvbi5kZWZhdWx0O1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gb3B0aW9uTmFtZSBpcyBwcmVzZW50IGluIG9wdGlvbnNPYmplY3RcbiAgICAgICAgICAgIGxldCB0eXBlT0sgPSB0cnVlO1xuICAgICAgICAgICAgbGV0IGFkZGl0aW9uYWxDaGVja09rID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIGZpcnN0LCBjaGVjayBqdXN0IGZvciB0aGUgZ2l2ZW4gdHlwZVxuICAgICAgICAgICAgaWYgKHRoaXMuaXNPZlR5cGUob3B0aW9uRGVmaW5pdGlvbi50eXBlLCAnTm9uRW1wdHlTdHJpbmcnKSAmJlxuICAgICAgICAgICAgICAgICF0aGlzLmlzT2ZUeXBlKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0sIG9wdGlvbkRlZmluaXRpb24udHlwZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLndhcm4oYCR7b3B0aW9uTmFtZX0gbXVzdCBiZSAke29wdGlvbkRlZmluaXRpb24udHlwZX0sIGAgK1xuICAgICAgICAgICAgICAgICAgICBgJHt0aGlzLnRvTmljZVN0cmluZyhvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdKX0gZ2l2ZW4sIHdpbGwgYXNzaWduIGRlZmF1bHRgKTtcbiAgICAgICAgICAgICAgICB0eXBlT0sgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGlmIHdlIGhhdmUgYW4gb2JqZWN0Q2xhc3MsIGNoZWNrIGZvciBpdFxuICAgICAgICAgICAgaWYgKHR5cGVPSyAmJiBvcHRpb25EZWZpbml0aW9uLnR5cGUgPT09ICdvYmplY3QnICYmICF0aGlzLmlzVW5kZWZpbmVkKG9wdGlvbkRlZmluaXRpb24ub2JqZWN0Q2xhc3MpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSBpbnN0YW5jZW9mIG9wdGlvbkRlZmluaXRpb24ub2JqZWN0Q2xhc3MpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud2FybihgJHtvcHRpb25OYW1lfSBtdXN0IGJlIGFuIG9iamVjdCBvZiBjbGFzcyAke29wdGlvbkRlZmluaXRpb24ub2JqZWN0Q2xhc3MubmFtZX0sYCArXG4gICAgICAgICAgICAgICAgICAgICAgICBgICR7b3B0aW9uc09iamVjdFtvcHRpb25OYW1lXS5jb25zdHJ1Y3Rvci5uYW1lfSBnaXZlbiwgd2lsbCBhc3NpZ24gZGVmYXVsdGApO1xuICAgICAgICAgICAgICAgICAgICB0eXBlT0sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5pc09mVHlwZShvcHRpb25EZWZpbml0aW9uLmNoZWNrZXIsICdmdW5jdGlvbicpICYmXG4gICAgICAgICAgICAgICAgIW9wdGlvbkRlZmluaXRpb24uY2hlY2tlcihvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdKSkge1xuICAgICAgICAgICAgICAgIHRoaXMud2FybihgJHtvcHRpb25OYW1lfSBtdXN0IGJlICR7b3B0aW9uRGVmaW5pdGlvbi5jaGVja0Rlc2NyaXB0aW9ufSwgYCArXG4gICAgICAgICAgICAgICAgICAgIGAke3RoaXMudG9OaWNlU3RyaW5nKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0pfSBnaXZlbiwgd2lsbCBhc3NpZ24gZGVmYXVsdGApO1xuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDaGVja09rID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZU9LICYmIGFkZGl0aW9uYWxDaGVja09rKSB7XG4gICAgICAgICAgICAgICAgY2xlYW5PcHRpb25zW29wdGlvbk5hbWVdID0gb3B0aW9uc09iamVjdFtvcHRpb25OYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzVW5kZWZpbmVkKG9wdGlvbkRlZmluaXRpb24uZGVmYXVsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvcihgR2l2ZW4gJHtvcHRpb25OYW1lfSBpcyBub3QgdmFsaWQsIGJ1dCB0aGVyZSBpcyBubyBkZWZhdWx0IHZhbHVlIGRlZmluZWRgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFuT3B0aW9uc1tvcHRpb25OYW1lXSA9IG9wdGlvbkRlZmluaXRpb24uZGVmYXVsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsZWFuT3B0aW9ucztcbiAgICB9XG4gICAgZ2V0RGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldENsZWFuT3B0aW9ucyh7fSk7XG4gICAgfVxuICAgIGVycm9yTWVzc2FnZShtc2cpIHtcbiAgICAgICAgcmV0dXJuIGAke3RoaXMuY29udGV4dFN0cn06ICR7bXNnfWA7XG4gICAgfVxuICAgIGVycm9yKG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLmVycm9yTWVzc2FnZShtZXNzYWdlKSk7XG4gICAgICAgIHRocm93IHRoaXMuZXJyb3JNZXNzYWdlKG1lc3NhZ2UpO1xuICAgIH1cbiAgICB3YXJuKG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc29sZS53YXJuKHRoaXMuZXJyb3JNZXNzYWdlKG1lc3NhZ2UpKTtcbiAgICB9XG4gICAgdG9OaWNlU3RyaW5nKHZhbHVlKSB7XG4gICAgICAgIHN3aXRjaCAodHlwZW9mICh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAnJHt2YWx1ZX0nYDtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgW0FycmF5XWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvci5uYW1lICE9PSAnT2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYFske3ZhbHVlLmNvbnN0cnVjdG9yLm5hbWV9XWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAnW09iamVjdF0nO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7dmFsdWV9YDtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdGlmKF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0pIHtcblx0XHRyZXR1cm4gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZVxuX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vRG9jUGFnZUxvYWRlci5qc1wiKTtcbi8vIFRoaXMgZW50cnkgbW9kdWxlIHVzZWQgJ2V4cG9ydHMnIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbiJdLCJzb3VyY2VSb290IjoiIn0=