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
/* harmony export */   "pushArray": () => (/* binding */ pushArray)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi90b29sYm94L0FycmF5VXRpbC5qcyIsIndlYnBhY2s6Ly8vLi90b29sYm94L0Z1bmN0aW9uVXRpbC5qcyIsIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly8vd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly8vd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly8vLi4vdGVzdC9qcy9tb2R1bGVzLXRvLXRlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QjtBQUM3QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVPLDZFQUE2RSxlQUFlO0FBQ25HO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0IsbUJBQW1CO0FBQ3JDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQixtQkFBbUI7QUFDcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVPO0FBQ1A7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDTztBQUNQO0FBQ0E7OztBQUdPO0FBQ1Asa0NBQWtDLHFCQUFxQjtBQUN2RDs7QUFFTztBQUNQO0FBQ0E7QUFDQTs7QUFFTztBQUNQO0FBQ0Esb0JBQW9CLFNBQVM7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7O0FBRU87QUFDUDtBQUNBOztBQUVPO0FBQ1A7QUFDQTtBQUNBLEdBQUc7QUFDSCxDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3JGTztBQUNBLDhCQUE4Qjs7QUFFOUI7QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDs7QUFFTztBQUNQO0FBQ0EsQzs7Ozs7O1VDekJBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7O1dDdEJBO1dBQ0E7V0FDQTtXQUNBO1dBQ0Esd0NBQXdDLHlDQUF5QztXQUNqRjtXQUNBO1dBQ0EsRTs7Ozs7V0NQQSx3Rjs7Ozs7V0NBQTtXQUNBO1dBQ0E7V0FDQSxzREFBc0Qsa0JBQWtCO1dBQ3hFO1dBQ0EsK0NBQStDLGNBQWM7V0FDN0QsRTs7Ozs7Ozs7Ozs7Ozs7QUNMdUQ7QUFDdkQsbUJBQW1CLGtEQUFTOztBQUU1QixDQUE2RDtBQUM3RCxzQkFBc0IscURBQVkiLCJmaWxlIjoiLi4vLi4vdGVzdC9qcy9KYXNtaW5lVGVzdHMuYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqICBDb3B5cmlnaHQgKEMpIDIwMjAgVW5pdmVyc2l0w6R0IHp1IEvDtmxuXG4gKlxuICogIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiAgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiAgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uICBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICpcbiAqL1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBzd2FwRWxlbWVudHModGhlQXJyYXksIGluZGV4MSwgaW5kZXgyKSB7XG4gIGxldCBlbGVtZW50MSA9IHRoZUFycmF5W2luZGV4MV1cbiAgdGhlQXJyYXlbaW5kZXgxXSA9IHRoZUFycmF5W2luZGV4Ml1cbiAgdGhlQXJyYXlbaW5kZXgyXSA9IGVsZW1lbnQxXG4gIHJldHVybiB0aGVBcnJheVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlzQXJlRXF1YWwoYXJyYXkxLCBhcnJheTIsIGNvbXBhcmlzb25GdW5jdGlvbiA9IGZ1bmN0aW9uIChhLGIpIHsgcmV0dXJuIGE9PT1iIH0sIGRlcHRoPSAxKSB7XG4gIGlmIChhcnJheTEubGVuZ3RoICE9PSBhcnJheTIubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgaWYgKGRlcHRoID09PSAxKSB7XG4gICAgLy8gc2ltcGxlIGVsZW1lbnQgYnkgZWxlbWVudCBjb21wYXJpc29uXG4gICAgZm9yKGxldCBpID0gMDsgaSA8IGFycmF5MS5sZW5ndGg7IGkrKyApIHtcbiAgICAgIGlmICghY29tcGFyaXNvbkZ1bmN0aW9uKGFycmF5MVtpXSwgYXJyYXkyW2ldKSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5MS5sZW5ndGg7IGkrKykge1xuICAgIGlmICghYXJyYXlzQXJlRXF1YWwoYXJyYXkxW2ldLCBhcnJheTJbaV0sIGNvbXBhcmlzb25GdW5jdGlvbiwgZGVwdGgtMSkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFyc0FyZUVxdWFsKHZhcjEsIHZhcjIpIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhcjEpID09PSBKU09OLnN0cmluZ2lmeSh2YXIyKVxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBib3RoIGFycmF5cyBoYXZlIHRoZSBzYW1lIHZhbHVlc1xuICogT25seSB3b3JrcyBpZiB0aGUgYXJyYXlzIGFyZSBjb21wb3NlZCBvZiB2YWx1ZXMgdGhhdCBjYW4gYmUgcmVwcmVzZW50ZWQgYXMgc3RyaW5nc1xuICogQHBhcmFtIGFycmF5MVxuICogQHBhcmFtIGFycmF5MlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlzSGF2ZVRoZVNhbWVWYWx1ZXMoYXJyYXkxLCBhcnJheTIpIHtcbiAgcmV0dXJuIGFycmF5MS5zb3J0KCkuam9pbignICcpID09PSBhcnJheTIuc29ydCgpLmpvaW4oJyAnKVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBwcmV0dHlQcmludEFycmF5KGFycmF5KSB7XG4gIHJldHVybiAnWycgKyBhcnJheS5tYXAoIChlKSA9PiB7IHJldHVybiBlLnRvU3RyaW5nKCl9KS5qb2luKCcsICcpICsgJ10nXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlQXJyYXkoYXJyYXkpIHtcbiAgYXJyYXkuc29ydCgoKSA9PiBNYXRoLnJhbmRvbSgpIC0gMC41KVxuICByZXR1cm4gYXJyYXlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlcXVlbmNlQXJyYXkoZnJvbSwgdG8sIGluY3JlbWVudCA9IDEpIHtcbiAgbGV0IHRoZUFycmF5ID0gW11cbiAgZm9yIChsZXQgaSA9IGZyb207IGkgPD0gdG87IGkrPWluY3JlbWVudCkge1xuICAgIHRoZUFycmF5LnB1c2goaSlcbiAgfVxuICByZXR1cm4gdGhlQXJyYXlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUluZGV4QXJyYXkoc2l6ZSkge1xuICByZXR1cm4gY3JlYXRlU2VxdWVuY2VBcnJheSgwLCBzaXplLTEsIDEpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwdXNoQXJyYXkodGhlQXJyYXksIGFycmF5VG9QdXNoKSB7XG4gIGFycmF5VG9QdXNoLmZvckVhY2goIChlKSA9PiB7XG4gICAgdGhlQXJyYXkucHVzaChlKVxuICB9KVxufSIsIlxuXG5leHBvcnQgZnVuY3Rpb24gZG9Ob3RoaW5nKCkge31cbmV4cG9ydCBmdW5jdGlvbiByZXR1cm5FbXB0eVN0cmluZygpIHsgcmV0dXJuICcnfVxuXG5leHBvcnQgZnVuY3Rpb24gZG9Ob3RoaW5nUHJvbWlzZShtc2cgPSAnJykge1xuICByZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlKSA9PiB7XG4gICAgaWYgKG1zZyAhPT0gJycpIHtcbiAgICAgIGNvbnNvbGUubG9nKG1zZylcbiAgICB9XG4gICAgcmVzb2x2ZSgpXG4gIH0pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmYWlsUHJvbWlzZShtc2c9ICcnLCByZWFzb24gPSAnbm8gcmVhc29uJykge1xuICByZXR1cm4gbmV3IFByb21pc2UgKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKG1zZyAhPT0gJycpIHtcbiAgICAgIGNvbnNvbGUubG9nKG1zZylcbiAgICB9XG4gICAgcmVqZWN0KHJlYXNvbilcbiAgfSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdhaXQobWlsbGlzZWNvbmRzKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbWlsbGlzZWNvbmRzKSk7XG59IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJcbmltcG9ydCAqIGFzIEFycmF5VXRpbCBmcm9tICcuLi8uLi9qcy90b29sYm94L0FycmF5VXRpbCdcbndpbmRvdy5BcnJheVV0aWwgPSBBcnJheVV0aWxcblxuaW1wb3J0ICogYXMgRnVuY3Rpb25VdGlsIGZyb20gJy4uLy4uL2pzL3Rvb2xib3gvRnVuY3Rpb25VdGlsJ1xud2luZG93LkZ1bmN0aW9uVXRpbCA9IEZ1bmN0aW9uVXRpbFxuXG4iXSwic291cmNlUm9vdCI6IiJ9