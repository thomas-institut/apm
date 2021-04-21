/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./toolbox/ArrayToTable.js":
/*!*********************************!*\
  !*** ./toolbox/ArrayToTable.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ArrayToTable": () => (/* binding */ ArrayToTable)
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



class ArrayToTable {

  constructor (options) {
    let optionsDefinition = {
      itemsPerRow: { type: 'NonZeroNumber', default: 20},
      tableClasses: { type: 'array', default: []},
      tdClasses: { type: 'array', default: []},
      trClasses: { type: 'array', default: []},
      getTrClasses: { type: 'function', default: (rowNumber, firstItemIndex) => {return []}},
      getTdClasses: { type: 'function', default: (item, index) => {return []}},
      getTdContent: { type: 'function', default: (item, index) => { return item.toString()}},
      data: { type: 'array', default: []},
    }

    let oc = new _thomas_inst_optionschecker__WEBPACK_IMPORTED_MODULE_0__.OptionsChecker(optionsDefinition, "ArrayToTable")
    this.options = oc.getCleanOptions(options)


    this.data = this.options.data

  }

  /**
   *
   * @param newData array
   */
  setData(newData) {
    this.data = newData
  }

  render() {
    let html = ''
    let numRows = Math.ceil(this.data.length / this.options.itemsPerRow)
    html += `<table ${this.genClassStatement(this.options.tableClasses)}>`
    for (let row = 0; row < numRows; row++) {
      let firstItemIndexInRow = row*this.options.itemsPerRow
      let lastItemIndexInRow = (row + 1)*this.options.itemsPerRow - 1
      if (lastItemIndexInRow >= this.data.length) {
        lastItemIndexInRow = this.data.length - 1
      }
      html += `<tr ${this.genClassStatement(this.options.getTrClasses(row, firstItemIndexInRow))}>`
      for (let index = firstItemIndexInRow; index <= lastItemIndexInRow; index++) {
        html +=`<td ${this.genClassStatement(this.options.getTdClasses(this.data[index], index))}>${this.options.getTdContent(this.data[index], index)}</td>`
      }
      html += '</td>'
    }
    html+= '</table>'
    return html
  }

  genClassStatement(classes) {
    if (classes.length === 0) {
      return ''
    }
    return `class="${classes.join(' ')}"`
  }
}


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
/*!*************************************************!*\
  !*** ../test/js/functional/TestArrayToTable.js ***!
  \*************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _js_toolbox_ArrayToTable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../js/toolbox/ArrayToTable */ "./toolbox/ArrayToTable.js");



$( () => {
  const selector = '#the-table'

  const numItems = 150

  let data = []
  for (let i = 0; i < numItems; i++) {
    data.push(Math.round(Math.random()*10000))
  }

  let a2t = new _js_toolbox_ArrayToTable__WEBPACK_IMPORTED_MODULE_0__.ArrayToTable({
    data: data,
    itemsPerRow: 9,
    tableClasses: [ 'number-table'],
    getTdClasses: (item, index) => {
      let rank = Math.floor(item/1000)
      return [ 'item', 'rank-' + rank, 'item-' + index]
    },
    getTrClasses:  (row, firstItemIndex) => {
       if (row % 2 ) {
         return [ 'odd-row']
       }
       return ['even-row']
    }
  })

  $(selector).html(a2t.render())
})
})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi90b29sYm94L0FycmF5VG9UYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi4vbm9kZV9tb2R1bGVzL0B0aG9tYXMtaW5zdC9vcHRpb25zY2hlY2tlci9PcHRpb25zQ2hlY2tlci5qcyIsIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly8vd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly8vd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly8vLi4vdGVzdC9qcy9mdW5jdGlvbmFsL1Rlc3RBcnJheVRvVGFibGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCO0FBQzdCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUUwRDs7QUFFbkQ7O0FBRVA7QUFDQTtBQUNBLG9CQUFvQixvQ0FBb0M7QUFDeEQscUJBQXFCLDRCQUE0QjtBQUNqRCxrQkFBa0IsNEJBQTRCO0FBQzlDLGtCQUFrQiw0QkFBNEI7QUFDOUMscUJBQXFCLDREQUE0RCxXQUFXO0FBQzVGLHFCQUFxQiw4Q0FBOEMsV0FBVztBQUM5RSxxQkFBcUIsOENBQThDLHlCQUF5QjtBQUM1RixhQUFhLDRCQUE0QjtBQUN6Qzs7QUFFQSxpQkFBaUIsdUVBQWM7QUFDL0I7OztBQUdBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLHNCQUFzQixrREFBa0Q7QUFDeEUscUJBQXFCLGVBQWU7QUFDcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQiw0RUFBNEU7QUFDakcsMkNBQTJDLDZCQUE2QjtBQUN4RSxzQkFBc0IsMkVBQTJFLEdBQUcsbURBQW1EO0FBQ3ZKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQixrQkFBa0I7QUFDdkM7QUFDQTs7Ozs7Ozs7Ozs7Ozs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QjtBQUM3QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOEJBQThCLE9BQU87QUFDckM7QUFDQTtBQUNBO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnREFBZ0QsS0FBSztBQUNyRDtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1EQUFtRCxXQUFXO0FBQzlEO0FBQ0E7QUFDQSxpRUFBaUUsV0FBVztBQUM1RTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QixXQUFXLFdBQVcsc0JBQXNCO0FBQ3pFLHVCQUF1Qiw2Q0FBNkM7QUFDcEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlDQUFpQyxXQUFXLDhCQUE4QixrQ0FBa0M7QUFDNUcsNEJBQTRCLDJDQUEyQztBQUN2RTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCLFdBQVcsV0FBVyxrQ0FBa0M7QUFDckYsdUJBQXVCLDZDQUE2QztBQUNwRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdDQUF3QyxXQUFXO0FBQ25EO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNDQUFzQztBQUN0QztBQUNBO0FBQ0Esa0JBQWtCLGdCQUFnQixJQUFJLElBQUk7QUFDMUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJCQUEyQixNQUFNO0FBQ2pDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0IsdUJBQXVCO0FBQ3REO0FBQ0E7QUFDQTtBQUNBLDBCQUEwQixNQUFNO0FBQ2hDO0FBQ0E7QUFDQTs7Ozs7OztVQy9KQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7OztXQ3RCQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLHdDQUF3Qyx5Q0FBeUM7V0FDakY7V0FDQTtXQUNBLEU7Ozs7O1dDUEEsd0Y7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0Esc0RBQXNELGtCQUFrQjtXQUN4RTtXQUNBLCtDQUErQyxjQUFjO1dBQzdELEU7Ozs7Ozs7Ozs7Ozs7QUNMK0Q7O0FBRS9EO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSxpQkFBaUIsY0FBYztBQUMvQjtBQUNBOztBQUVBLGdCQUFnQixrRUFBWTtBQUM1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBLENBQUMsQyIsImZpbGUiOiIuLi8uLi90ZXN0L2pzL2Z1bmN0aW9uYWwvZGlzdC9UZXN0QXJyYXlUb1RhYmxlLmJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiAgQ29weXJpZ2h0IChDKSAyMDIwIFVuaXZlcnNpdMOkdCB6dSBLw7ZsblxuICpcbiAqICBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqICAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqICBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqICBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqICBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICogIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLiAgSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqXG4gKi9cblxuaW1wb3J0IHtPcHRpb25zQ2hlY2tlcn0gZnJvbSAnQHRob21hcy1pbnN0L29wdGlvbnNjaGVja2VyJ1xuXG5leHBvcnQgY2xhc3MgQXJyYXlUb1RhYmxlIHtcblxuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIGxldCBvcHRpb25zRGVmaW5pdGlvbiA9IHtcbiAgICAgIGl0ZW1zUGVyUm93OiB7IHR5cGU6ICdOb25aZXJvTnVtYmVyJywgZGVmYXVsdDogMjB9LFxuICAgICAgdGFibGVDbGFzc2VzOiB7IHR5cGU6ICdhcnJheScsIGRlZmF1bHQ6IFtdfSxcbiAgICAgIHRkQ2xhc3NlczogeyB0eXBlOiAnYXJyYXknLCBkZWZhdWx0OiBbXX0sXG4gICAgICB0ckNsYXNzZXM6IHsgdHlwZTogJ2FycmF5JywgZGVmYXVsdDogW119LFxuICAgICAgZ2V0VHJDbGFzc2VzOiB7IHR5cGU6ICdmdW5jdGlvbicsIGRlZmF1bHQ6IChyb3dOdW1iZXIsIGZpcnN0SXRlbUluZGV4KSA9PiB7cmV0dXJuIFtdfX0sXG4gICAgICBnZXRUZENsYXNzZXM6IHsgdHlwZTogJ2Z1bmN0aW9uJywgZGVmYXVsdDogKGl0ZW0sIGluZGV4KSA9PiB7cmV0dXJuIFtdfX0sXG4gICAgICBnZXRUZENvbnRlbnQ6IHsgdHlwZTogJ2Z1bmN0aW9uJywgZGVmYXVsdDogKGl0ZW0sIGluZGV4KSA9PiB7IHJldHVybiBpdGVtLnRvU3RyaW5nKCl9fSxcbiAgICAgIGRhdGE6IHsgdHlwZTogJ2FycmF5JywgZGVmYXVsdDogW119LFxuICAgIH1cblxuICAgIGxldCBvYyA9IG5ldyBPcHRpb25zQ2hlY2tlcihvcHRpb25zRGVmaW5pdGlvbiwgXCJBcnJheVRvVGFibGVcIilcbiAgICB0aGlzLm9wdGlvbnMgPSBvYy5nZXRDbGVhbk9wdGlvbnMob3B0aW9ucylcblxuXG4gICAgdGhpcy5kYXRhID0gdGhpcy5vcHRpb25zLmRhdGFcblxuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBuZXdEYXRhIGFycmF5XG4gICAqL1xuICBzZXREYXRhKG5ld0RhdGEpIHtcbiAgICB0aGlzLmRhdGEgPSBuZXdEYXRhXG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgbGV0IGh0bWwgPSAnJ1xuICAgIGxldCBudW1Sb3dzID0gTWF0aC5jZWlsKHRoaXMuZGF0YS5sZW5ndGggLyB0aGlzLm9wdGlvbnMuaXRlbXNQZXJSb3cpXG4gICAgaHRtbCArPSBgPHRhYmxlICR7dGhpcy5nZW5DbGFzc1N0YXRlbWVudCh0aGlzLm9wdGlvbnMudGFibGVDbGFzc2VzKX0+YFxuICAgIGZvciAobGV0IHJvdyA9IDA7IHJvdyA8IG51bVJvd3M7IHJvdysrKSB7XG4gICAgICBsZXQgZmlyc3RJdGVtSW5kZXhJblJvdyA9IHJvdyp0aGlzLm9wdGlvbnMuaXRlbXNQZXJSb3dcbiAgICAgIGxldCBsYXN0SXRlbUluZGV4SW5Sb3cgPSAocm93ICsgMSkqdGhpcy5vcHRpb25zLml0ZW1zUGVyUm93IC0gMVxuICAgICAgaWYgKGxhc3RJdGVtSW5kZXhJblJvdyA+PSB0aGlzLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgIGxhc3RJdGVtSW5kZXhJblJvdyA9IHRoaXMuZGF0YS5sZW5ndGggLSAxXG4gICAgICB9XG4gICAgICBodG1sICs9IGA8dHIgJHt0aGlzLmdlbkNsYXNzU3RhdGVtZW50KHRoaXMub3B0aW9ucy5nZXRUckNsYXNzZXMocm93LCBmaXJzdEl0ZW1JbmRleEluUm93KSl9PmBcbiAgICAgIGZvciAobGV0IGluZGV4ID0gZmlyc3RJdGVtSW5kZXhJblJvdzsgaW5kZXggPD0gbGFzdEl0ZW1JbmRleEluUm93OyBpbmRleCsrKSB7XG4gICAgICAgIGh0bWwgKz1gPHRkICR7dGhpcy5nZW5DbGFzc1N0YXRlbWVudCh0aGlzLm9wdGlvbnMuZ2V0VGRDbGFzc2VzKHRoaXMuZGF0YVtpbmRleF0sIGluZGV4KSl9PiR7dGhpcy5vcHRpb25zLmdldFRkQ29udGVudCh0aGlzLmRhdGFbaW5kZXhdLCBpbmRleCl9PC90ZD5gXG4gICAgICB9XG4gICAgICBodG1sICs9ICc8L3RkPidcbiAgICB9XG4gICAgaHRtbCs9ICc8L3RhYmxlPidcbiAgICByZXR1cm4gaHRtbFxuICB9XG5cbiAgZ2VuQ2xhc3NTdGF0ZW1lbnQoY2xhc3Nlcykge1xuICAgIGlmIChjbGFzc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICAgIHJldHVybiBgY2xhc3M9XCIke2NsYXNzZXMuam9pbignICcpfVwiYFxuICB9XG59XG4iLCIvKlxuICogIENvcHlyaWdodCAoQykgMjAxOS0yMDIwIFVuaXZlcnNpdMOkdCB6dSBLw7ZsblxuICpcbiAqICBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqICAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqICBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqICBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqICBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICogIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLiAgSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqXG4gKi9cbi8qKlxuICogVXRpbGl0eSBjbGFzcyB0byBjaGVjayBhbmQgZ2VuZXJhdGUgYSBcImNsZWFuXCIgIG9wdGlvbnMgb2JqZWN0XG4gKlxuICogVGhlIG9wdGlvbnNEZWZpbml0aW9uIG9iamVjdCBwYXNzZWQgdG8gdGhlICBjb25zdHJ1Y3RvciBzaG91bGQgaGF2ZSBhcyBwcm9wZXJ0aWVzIHRoZVxuICogZGVmaW5pdGlvbiBvZiBlYWNoIG9wdGlvbiB0byBiZSBjaGVja2VkLiBFYWNoIHByb3BlcnR5LCBpbiB0dXJuLCBoYXMgdGhlIGZvbGxvd2luZ1xuICogcHJvcGVydGllczpcbiAqXG4gKiAgIG9wdGlvbk5hbWU6ICB7XG4gKiAgICAgcmVxdWlyZWQ6IDx0cnVlL2ZhbHNlPiAgLy8gb3B0aW9uYWwsIGlmIG5vdCBwcmVzZW50IGl0IGRlZmF1bHRzIHRvIGZhbHNlIChpLmUuLCB0aGUgb3B0aW9uIGlzIG5vdCByZXF1aXJlZClcbiAqICAgICBkZWZhdWx0OiAgPGRlZmF1bHQgVmFsdWU+IC8vIGlmIHJlcXVpcmVkPT09dHJ1ZSwgdGhlIGRlZmF1bHQgdmFsdWUgd2lsbCBiZSBpZ25vcmVkXG4gKiAgICAgdHlwZTogJ3R5cGVfc3RyaW5nJyAgIC8vIG9wdGlvbmFsIHR5cGUgcmVxdWlyZW1lbnQgZm9yIHRoZSBvcHRpb25cbiAqICAgICAgICAgdHlwZV9zdHJpbmcgY2FuIGJlIGEgSmF2YXNjcmlwdCB0eXBlIG5hbWU6ICAnc3RyaW5nJywgJ251bWJlcicsICdvYmplY3QnLCAnYm9vbGVhbicsICdmdW5jdGlvbidcbiAqICAgICAgICAgaXQgY2FuIGFsc28gYmUgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG4gKiAgICAgICAgICAgICAnTm9uRW1wdHlTdHJpbmcnXG4gKiAgICAgICAgICAgICAnTnVtYmVyR3JlYXRlclRoYW5aZXJvJ1xuICogICAgICAgICAgICAgJ05vblplcm9OdW1iZXInXG4gKiAgICAgICAgICAgICAnQXJyYXknXG4gKlxuICogICAgIG9iamVjdENsYXNzOiBTb21lQ2xhc3MgLy8gaWYgcHJlc2VudCBhbmQgdHlwZT09PSdvYmplY3QnLCB0aGUgZ2l2ZW4gdmFsdWUgaXMgY2hlY2tlZCB0byBiZSBhIGluc3RhbmNlIG9mIHRoaXMgY2xhc3NcbiAqICAgICBjaGVja2VyOiBmdW5jdGlvbiAodikgeyAuLi4uIH0gIC8vIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgcGVyZm9ybXMgYWRkaXRpb25hbCBjaGVja3Mgb24gdGhlIGdpdmVuIHZhbHVlXG4gKiAgICAgY2hlY2tEZXNjcmlwdGlvbjogIDxzdHJpbmcgZGVzY3JpcHRpb24gb2YgYWRkaXRpb25hbCBjaGVjayBhc2RmXG4gKiAgIH1cbiAqL1xuZXhwb3J0IGNsYXNzIE9wdGlvbnNDaGVja2VyIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zRGVmaW5pdGlvbiwgY29udGV4dFN0cikge1xuICAgICAgICB0aGlzLm9wdGlvbnNEZWZpbml0aW9uID0gb3B0aW9uc0RlZmluaXRpb247XG4gICAgICAgIHRoaXMuY29udGV4dFN0ciA9IGNvbnRleHRTdHI7XG4gICAgfVxuICAgIGlzT2ZUeXBlKHZhbHVlLCB0eXBlKSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgLy8gbm9ybWFsIGphdmFzY3JpcHQgdHlwZVxuICAgICAgICAgICAgICAgIHJldHVybiAodHlwZW9mICh2YWx1ZSkgPT09IHR5cGUpO1xuICAgICAgICAgICAgY2FzZSAnTm9uRW1wdHlTdHJpbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgKHZhbHVlKSA9PT0gJ3N0cmluZycgJiYgdmFsdWUgIT09ICcnO1xuICAgICAgICAgICAgY2FzZSAnTnVtYmVyR3JlYXRlclRoYW5aZXJvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mICh2YWx1ZSkgPT09ICdudW1iZXInICYmIHZhbHVlID4gMDtcblxuICAgICAgICAgICAgY2FzZSAnTm9uWmVyb051bWJlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiAodmFsdWUpID09PSAnbnVtYmVyJyAmJiB2YWx1ZSAhPT0gMDtcblxuICAgICAgICAgICAgY2FzZSAnQXJyYXknOlxuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy5lcnJvcihgVW5zdXBwb3J0ZWQgdHlwZSAnJHt0eXBlfScgZm91bmQgaW4gb3B0aW9ucyBkZWZpbml0aW9uYCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpc1VuZGVmaW5lZCh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHlwZW9mICh2YWx1ZSkgPT09ICd1bmRlZmluZWQnO1xuICAgIH1cblxuICAgIGdldENsZWFuT3B0aW9ucyhvcHRpb25zT2JqZWN0KSB7XG4gICAgICAgIGxldCBjbGVhbk9wdGlvbnMgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBvcHRpb25OYW1lIGluIHRoaXMub3B0aW9uc0RlZmluaXRpb24pIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zRGVmaW5pdGlvbi5oYXNPd25Qcm9wZXJ0eShvcHRpb25OYW1lKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IG9wdGlvbkRlZmluaXRpb24gPSB0aGlzLm9wdGlvbnNEZWZpbml0aW9uW29wdGlvbk5hbWVdO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNVbmRlZmluZWQob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSkpIHtcbiAgICAgICAgICAgICAgICAvLyBvcHRpb25OYW1lIGlzIE5PVCAgaW4gb3B0aW9uc09iamVjdFxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25EZWZpbml0aW9uLnJlcXVpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IoYFJlcXVpcmVkIG9wdGlvbiAnJHtvcHRpb25OYW1lfScgbm90IGZvdW5kYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzVW5kZWZpbmVkKG9wdGlvbkRlZmluaXRpb24uZGVmYXVsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvcihgTm8gZGVmYXVsdCBkZWZpbmVkIGZvciBvcHRpb24gJyR7b3B0aW9uTmFtZX0nYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsZWFuT3B0aW9uc1tvcHRpb25OYW1lXSA9IG9wdGlvbkRlZmluaXRpb24uZGVmYXVsdDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG9wdGlvbk5hbWUgaXMgcHJlc2VudCBpbiBvcHRpb25zT2JqZWN0XG4gICAgICAgICAgICBsZXQgdHlwZU9LID0gdHJ1ZTtcbiAgICAgICAgICAgIGxldCBhZGRpdGlvbmFsQ2hlY2tPayA9IHRydWU7XG4gICAgICAgICAgICAvLyBmaXJzdCwgY2hlY2sganVzdCBmb3IgdGhlIGdpdmVuIHR5cGVcbiAgICAgICAgICAgIGlmICh0aGlzLmlzT2ZUeXBlKG9wdGlvbkRlZmluaXRpb24udHlwZSwgJ05vbkVtcHR5U3RyaW5nJykgJiZcbiAgICAgICAgICAgICAgICAhdGhpcy5pc09mVHlwZShvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdLCBvcHRpb25EZWZpbml0aW9uLnR5cGUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53YXJuKGAke29wdGlvbk5hbWV9IG11c3QgYmUgJHtvcHRpb25EZWZpbml0aW9uLnR5cGV9LCBgICtcbiAgICAgICAgICAgICAgICAgICAgYCR7dGhpcy50b05pY2VTdHJpbmcob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSl9IGdpdmVuLCB3aWxsIGFzc2lnbiBkZWZhdWx0YCk7XG4gICAgICAgICAgICAgICAgdHlwZU9LID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpZiB3ZSBoYXZlIGFuIG9iamVjdENsYXNzLCBjaGVjayBmb3IgaXRcbiAgICAgICAgICAgIGlmICh0eXBlT0sgJiYgb3B0aW9uRGVmaW5pdGlvbi50eXBlID09PSAnb2JqZWN0JyAmJiAhdGhpcy5pc1VuZGVmaW5lZChvcHRpb25EZWZpbml0aW9uLm9iamVjdENsYXNzKSkge1xuICAgICAgICAgICAgICAgIGlmICghKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0gaW5zdGFuY2VvZiBvcHRpb25EZWZpbml0aW9uLm9iamVjdENsYXNzKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLndhcm4oYCR7b3B0aW9uTmFtZX0gbXVzdCBiZSBhbiBvYmplY3Qgb2YgY2xhc3MgJHtvcHRpb25EZWZpbml0aW9uLm9iamVjdENsYXNzLm5hbWV9LGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgYCAke29wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0uY29uc3RydWN0b3IubmFtZX0gZ2l2ZW4sIHdpbGwgYXNzaWduIGRlZmF1bHRgKTtcbiAgICAgICAgICAgICAgICAgICAgdHlwZU9LID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuaXNPZlR5cGUob3B0aW9uRGVmaW5pdGlvbi5jaGVja2VyLCAnZnVuY3Rpb24nKSAmJlxuICAgICAgICAgICAgICAgICFvcHRpb25EZWZpbml0aW9uLmNoZWNrZXIob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLndhcm4oYCR7b3B0aW9uTmFtZX0gbXVzdCBiZSAke29wdGlvbkRlZmluaXRpb24uY2hlY2tEZXNjcmlwdGlvbn0sIGAgK1xuICAgICAgICAgICAgICAgICAgICBgJHt0aGlzLnRvTmljZVN0cmluZyhvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdKX0gZ2l2ZW4sIHdpbGwgYXNzaWduIGRlZmF1bHRgKTtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2hlY2tPayA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVPSyAmJiBhZGRpdGlvbmFsQ2hlY2tPaykge1xuICAgICAgICAgICAgICAgIGNsZWFuT3B0aW9uc1tvcHRpb25OYW1lXSA9IG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1VuZGVmaW5lZChvcHRpb25EZWZpbml0aW9uLmRlZmF1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IoYEdpdmVuICR7b3B0aW9uTmFtZX0gaXMgbm90IHZhbGlkLCBidXQgdGhlcmUgaXMgbm8gZGVmYXVsdCB2YWx1ZSBkZWZpbmVkYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjbGVhbk9wdGlvbnNbb3B0aW9uTmFtZV0gPSBvcHRpb25EZWZpbml0aW9uLmRlZmF1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbGVhbk9wdGlvbnM7XG4gICAgfVxuICAgIGdldERlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRDbGVhbk9wdGlvbnMoe30pO1xuICAgIH1cbiAgICBlcnJvck1lc3NhZ2UobXNnKSB7XG4gICAgICAgIHJldHVybiBgJHt0aGlzLmNvbnRleHRTdHJ9OiAke21zZ31gO1xuICAgIH1cbiAgICBlcnJvcihtZXNzYWdlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy5lcnJvck1lc3NhZ2UobWVzc2FnZSkpO1xuICAgICAgICB0aHJvdyB0aGlzLmVycm9yTWVzc2FnZShtZXNzYWdlKTtcbiAgICB9XG4gICAgd2FybihtZXNzYWdlKSB7XG4gICAgICAgIGNvbnNvbGUud2Fybih0aGlzLmVycm9yTWVzc2FnZShtZXNzYWdlKSk7XG4gICAgfVxuICAgIHRvTmljZVN0cmluZyh2YWx1ZSkge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiAodmFsdWUpKSB7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBgJyR7dmFsdWV9J2A7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYFtBcnJheV1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUuY29uc3RydWN0b3IubmFtZSAhPT0gJ09iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBbJHt2YWx1ZS5jb25zdHJ1Y3Rvci5uYW1lfV1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJ1tPYmplY3RdJztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke3ZhbHVlfWA7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIlxuaW1wb3J0IHsgQXJyYXlUb1RhYmxlIH0gZnJvbSAnLi4vLi4vLi4vanMvdG9vbGJveC9BcnJheVRvVGFibGUnXG5cbiQoICgpID0+IHtcbiAgY29uc3Qgc2VsZWN0b3IgPSAnI3RoZS10YWJsZSdcblxuICBjb25zdCBudW1JdGVtcyA9IDE1MFxuXG4gIGxldCBkYXRhID0gW11cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1JdGVtczsgaSsrKSB7XG4gICAgZGF0YS5wdXNoKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSoxMDAwMCkpXG4gIH1cblxuICBsZXQgYTJ0ID0gbmV3IEFycmF5VG9UYWJsZSh7XG4gICAgZGF0YTogZGF0YSxcbiAgICBpdGVtc1BlclJvdzogOSxcbiAgICB0YWJsZUNsYXNzZXM6IFsgJ251bWJlci10YWJsZSddLFxuICAgIGdldFRkQ2xhc3NlczogKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICBsZXQgcmFuayA9IE1hdGguZmxvb3IoaXRlbS8xMDAwKVxuICAgICAgcmV0dXJuIFsgJ2l0ZW0nLCAncmFuay0nICsgcmFuaywgJ2l0ZW0tJyArIGluZGV4XVxuICAgIH0sXG4gICAgZ2V0VHJDbGFzc2VzOiAgKHJvdywgZmlyc3RJdGVtSW5kZXgpID0+IHtcbiAgICAgICBpZiAocm93ICUgMiApIHtcbiAgICAgICAgIHJldHVybiBbICdvZGQtcm93J11cbiAgICAgICB9XG4gICAgICAgcmV0dXJuIFsnZXZlbi1yb3cnXVxuICAgIH1cbiAgfSlcblxuICAkKHNlbGVjdG9yKS5odG1sKGEydC5yZW5kZXIoKSlcbn0pIl0sInNvdXJjZVJvb3QiOiIifQ==