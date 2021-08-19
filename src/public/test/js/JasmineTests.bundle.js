/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./toolbox/ArrayUtil.js":
/*!******************************!*\
  !*** ./toolbox/ArrayUtil.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "swapElements": () => (/* binding */ swapElements),
/* harmony export */   "arraysAreEqual": () => (/* binding */ arraysAreEqual),
/* harmony export */   "varsAreEqual": () => (/* binding */ varsAreEqual),
/* harmony export */   "arraysHaveTheSameValues": () => (/* binding */ arraysHaveTheSameValues),
/* harmony export */   "prettyPrintArray": () => (/* binding */ prettyPrintArray),
/* harmony export */   "shuffleArray": () => (/* binding */ shuffleArray),
/* harmony export */   "createSequenceArray": () => (/* binding */ createSequenceArray),
/* harmony export */   "createIndexArray": () => (/* binding */ createIndexArray),
/* harmony export */   "pushArray": () => (/* binding */ pushArray),
/* harmony export */   "joinWithArray": () => (/* binding */ joinWithArray)
/* harmony export */ });
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


function swapElements(theArray, index1, index2) {
  let element1 = theArray[index1]
  theArray[index1] = theArray[index2]
  theArray[index2] = element1
  return theArray
}

function arraysAreEqual(array1, array2, comparisonFunction = function (a,b) { return a===b }, depth= 1) {
  if (array1.length !== array2.length) {
    return false
  }
  if (depth === 1) {
    // simple element by element comparison
    for(let i = 0; i < array1.length; i++ ) {
      if (!comparisonFunction(array1[i], array2[i])) {
        return false
      }
    }
    return true
  }
  for (let i = 0; i < array1.length; i++) {
    if (!arraysAreEqual(array1[i], array2[i], comparisonFunction, depth-1)) {
      return false
    }
  }
  return true
}

function varsAreEqual(var1, var2) {
  return JSON.stringify(var1) === JSON.stringify(var2)
}

/**
 * Returns true if both arrays have the same values
 * Only works if the arrays are composed of values that can be represented as strings
 * @param array1
 * @param array2
 */
function arraysHaveTheSameValues(array1, array2) {
  return array1.sort().join(' ') === array2.sort().join(' ')
}


function prettyPrintArray(array) {
  return '[' + array.map( (e) => { return e.toString()}).join(', ') + ']'
}

function shuffleArray(array) {
  array.sort(() => Math.random() - 0.5)
  return array
}

function createSequenceArray(from, to, increment = 1) {
  let theArray = []
  for (let i = from; i <= to; i+=increment) {
    theArray.push(i)
  }
  return theArray
}

function createIndexArray(size) {
  return createSequenceArray(0, size-1, 1)
}

function pushArray(theArray, arrayToPush) {
  arrayToPush.forEach( (e) => {
    theArray.push(e)
  })
}

/**
 *
 * @param {array} sourceArray
 * @param {any} separator
 */
function joinWithArray(sourceArray, separator) {
  let newArray = []
  if (sourceArray.length === 0) {
    return []
  }

  for (let i=0; i < sourceArray.length -1; i++) {
    newArray.push(sourceArray[i])
    newArray.push(separator)
  }

  newArray.push(sourceArray[sourceArray.length-1])
  return newArray
}

/***/ }),

/***/ "./toolbox/FunctionUtil.js":
/*!*********************************!*\
  !*** ./toolbox/FunctionUtil.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "doNothing": () => (/* binding */ doNothing),
/* harmony export */   "returnEmptyString": () => (/* binding */ returnEmptyString),
/* harmony export */   "doNothingPromise": () => (/* binding */ doNothingPromise),
/* harmony export */   "failPromise": () => (/* binding */ failPromise),
/* harmony export */   "wait": () => (/* binding */ wait)
/* harmony export */ });


function doNothing() {}
function returnEmptyString() { return ''}

function doNothingPromise(msg = '') {
  return new Promise( (resolve) => {
    if (msg !== '') {
      console.log(msg)
    }
    resolve()
  })
}

function failPromise(msg= '', reason = 'no reason') {
  return new Promise ( (resolve, reject) => {
    if (msg !== '') {
      console.log(msg)
    }
    reject(reason)
  })
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
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
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
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
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!*************************************!*\
  !*** ../test/js/modules-to-test.js ***!
  \*************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _js_toolbox_ArrayUtil__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../js/toolbox/ArrayUtil */ "./toolbox/ArrayUtil.js");
/* harmony import */ var _js_toolbox_FunctionUtil__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../js/toolbox/FunctionUtil */ "./toolbox/FunctionUtil.js");


window.ArrayUtil = _js_toolbox_ArrayUtil__WEBPACK_IMPORTED_MODULE_0__

;
window.FunctionUtil = _js_toolbox_FunctionUtil__WEBPACK_IMPORTED_MODULE_1__


})();

/******/ })()
;
//# sourceMappingURL=JasmineTests.bundle.js.map