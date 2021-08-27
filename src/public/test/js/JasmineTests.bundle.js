/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./FmtText/FmtTextFactory.js":
/*!***********************************!*\
  !*** ./FmtText/FmtTextFactory.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "FmtTextFactory": () => (/* binding */ FmtTextFactory)
/* harmony export */ });
/* harmony import */ var _FmtTextTokenFactory__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./FmtTextTokenFactory */ "./FmtText/FmtTextTokenFactory.js");
/* harmony import */ var _FmtTextToken__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./FmtTextToken */ "./FmtText/FmtTextToken.js");
/*
 *  Copyright (C) 2021 Universität zu Köln
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



/*

FmtText is not a class per se but simply an array of FormattedTextToken

Any function that takes FormattedText as input could also accept shortcut representations of basic text that can
easily be transformed into a fully specified array of FormattedTextToken. For example: a simple string including
spaces, an array mixing FormattedTextToken objects and strings.

  Also, it is not necessary to provide any attribute that can have a sensible default. So, a glue token can
be just { type: glue }  and a text token { text: 'someString' }
 */





class FmtTextFactory {

  /**
   * Creates a FmtText array from a string
   * @param {string} theString
   * @returns { FmtTextToken[] }
   */
  static fromString(theString) {

    let fmtText = []
    let currentWord = ''

    Array.from(sanitizeString(theString)).forEach( (char) => {
      if (char === ' ') {
        if (currentWord !== '') {
          fmtText.push(_FmtTextTokenFactory__WEBPACK_IMPORTED_MODULE_0__.FmtTextTokenFactory.normalText(currentWord))
          currentWord = ''
        }
        fmtText.push(_FmtTextTokenFactory__WEBPACK_IMPORTED_MODULE_0__.FmtTextTokenFactory.normalSpace())
      } else {
        currentWord += char
      }
    })
    if (currentWord !== '') {
      fmtText.push(_FmtTextTokenFactory__WEBPACK_IMPORTED_MODULE_0__.FmtTextTokenFactory.normalText(currentWord))
    }
    return fmtText
  }

  /**
   *
   * @param {*} theThing
   * @returns {FmtTextToken[]}
   */
  static fromAnything(theThing) {

    if (Array.isArray(theThing)) {
      let fmtText = []
      theThing.forEach( (arrayElement) => {
        fmtText = fmtText.concat( this.fromAnything(arrayElement))
      })
      return fmtText
    }
    if (typeof theThing === 'object') {
      return [_FmtTextTokenFactory__WEBPACK_IMPORTED_MODULE_0__.FmtTextTokenFactory.buildFromObject(theThing)]
    }
    if (typeof theThing === 'string') {
      return this.fromString(theThing)
    }

    if (theThing.toString() !== undefined) {
      return FmtTextFactory.fromString(theThing.toString())
    }
    console.warn(`Cannot create FmtText from given value`)
    console.log(theThing)

    return this.empty()
  }

  static empty() {
    return []
  }

  static oneNormalSpace() {
    return [ _FmtTextTokenFactory__WEBPACK_IMPORTED_MODULE_0__.FmtTextTokenFactory.normalSpace() ]
  }
}

/**
 *
 * @param {string} str
 * @returns {string}
 */
function sanitizeString(str) {
  return str.replace(/\s+/g, ' ')
}

/***/ }),

/***/ "./FmtText/FmtTextToken.js":
/*!*********************************!*\
  !*** ./FmtText/FmtTextToken.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DEFAULT_GLUE_SPACE": () => (/* binding */ DEFAULT_GLUE_SPACE),
/* harmony export */   "FmtTextToken": () => (/* binding */ FmtTextToken)
/* harmony export */ });
/* harmony import */ var _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./FmtTextTokenType */ "./FmtText/FmtTextTokenType.js");
/* harmony import */ var _FontStyle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./FontStyle */ "./FmtText/FontStyle.js");
/* harmony import */ var _FontSize__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./FontSize */ "./FmtText/FontSize.js");
/* harmony import */ var _FontWeight__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./FontWeight */ "./FmtText/FontWeight.js");
/* harmony import */ var _VerticalAlign__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./VerticalAlign */ "./FmtText/VerticalAlign.js");
/*
 *  Copyright (C) 2021 Universität zu Köln
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




/*

Essentially a string with some standard attributes, or some empty space

FormattedTextToken := {
    type:  glue | text

    type === glue :
       The term 'glue' is taken from Donald Knuth's the TeX book, where it is explained in
       chapter 12. Glue is meant to represent a potentially variable-length space that may or
       may not eventually appear in a representation of the text. It may not appear, for example, in
       a printed version of the text if it is an inter-word space that falls at the end of the line.
       This allows for more sophisticated typesetting in printed form.

       {
          space: a space size in pixels, if negative, defaults to a standard size defined by some typesetting engine
          stretch: extra pixels the space can have, this is only a suggestion, the typesetter
                   algorithm may stretch spaces more than this in extreme situations.
          shrink: number, how many pixels less the space can have; (space - shrink) is the absolute minimum
                  for the space

       }

    type ===  text :
       {
           text: string
           weight:  normal, bold, semibold, light, etc
           style: normal, italic
           size:  dimension (pt, em, %)
           decoration: none, underline, overline, strikethrough
           verticalAlign:  baseline, super, sub
           fontFamily:  string, a font name
           fontStyle: normal, italic
           fontVariant: normal, small-caps, etc
           direction: 'rtl' | 'ltr'
        }
}



 */








const DEFAULT_GLUE_SPACE = -1

class FmtTextToken {

  constructor (type = _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_0__.TEXT) {
    this.type = type
    switch(type) {
      case _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_0__.TEXT:
        this.text = ''
        this.fontStyle = _FontStyle__WEBPACK_IMPORTED_MODULE_1__.NORMAL
        this.fontWeight = _FontWeight__WEBPACK_IMPORTED_MODULE_3__.NORMAL
        this.verticalAlign = _VerticalAlign__WEBPACK_IMPORTED_MODULE_4__.BASELINE
        this.fontSize = _FontSize__WEBPACK_IMPORTED_MODULE_2__.NORMAL
        break

      case _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_0__.GLUE:
        this.space = DEFAULT_GLUE_SPACE // i.e., default size, whatever that means for the typesetter/presenter context
        break

      default:
        console.warn(`Unsupported type in FormattedTextToken constructor: ${type}`)
        this.type = _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_0__.EMPTY
    }
  }

  getPlainText() {
    return this.type === _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_0__.GLUE ? ' ' : this.text
  }

  setText(text) {
    this.text = text
    return this
  }

  setFontSize(fontSize) {
    this.fontSize = fontSize
    return this
  }

  setItalic() {
    this.fontStyle = _FontStyle__WEBPACK_IMPORTED_MODULE_1__.ITALIC
    return this
  }

  setNormalSlant() {
    this.fontStyle = _FontStyle__WEBPACK_IMPORTED_MODULE_1__.NORMAL
    return this
  }

  setBold() {
    this.fontWeight = _FontWeight__WEBPACK_IMPORTED_MODULE_3__.BOLD
    return this
  }

  setNormalWeight() {
    this.fontWeight = _FontWeight__WEBPACK_IMPORTED_MODULE_3__.NORMAL
    return this
  }

  setLength(spaceLength) {
    this.space = spaceLength
    return this
  }

  setSuperScript() {
    this.verticalAlign = _VerticalAlign__WEBPACK_IMPORTED_MODULE_4__.SUPERSCRIPT
    return this
  }

  setSubScript() {
    this.verticalAlign = _VerticalAlign__WEBPACK_IMPORTED_MODULE_4__.SUBSCRIPT
    return this
  }

  setSmallFont() {
    this.fontSize = _FontSize__WEBPACK_IMPORTED_MODULE_2__.SMALL
  }

}

/***/ }),

/***/ "./FmtText/FmtTextTokenFactory.js":
/*!****************************************!*\
  !*** ./FmtText/FmtTextTokenFactory.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "FmtTextTokenFactory": () => (/* binding */ FmtTextTokenFactory)
/* harmony export */ });
/* harmony import */ var _FmtTextToken__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./FmtTextToken */ "./FmtText/FmtTextToken.js");
/* harmony import */ var _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./FmtTextTokenType */ "./FmtText/FmtTextTokenType.js");
/*
 *  Copyright (C) 2021 Universität zu Köln
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




class FmtTextTokenFactory {

  /**
   *
   * @param {string} someString
   * @returns {FmtTextToken}
   */
  static normalText(someString) {
    return (new _FmtTextToken__WEBPACK_IMPORTED_MODULE_0__.FmtTextToken(_FmtTextTokenType__WEBPACK_IMPORTED_MODULE_1__.TEXT)).setText(someString)
  }

  static normalSpace() {
    return new _FmtTextToken__WEBPACK_IMPORTED_MODULE_0__.FmtTextToken(_FmtTextTokenType__WEBPACK_IMPORTED_MODULE_1__.GLUE)
  }

  /**
   *
   * @param textToken
   */
  static clone(textToken) {
    let newText = new _FmtTextToken__WEBPACK_IMPORTED_MODULE_0__.FmtTextToken()
    newText.type = textToken.type
    switch(newText.type) {
      case _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_1__.TEXT:
        newText.text = textToken.text
        newText.fontStyle = textToken.fontStyle
        newText.fontWeight = textToken.fontWeight
        newText.verticalAlign = textToken.verticalAlign
        newText.fontSize = textToken.fontSize
        break

      case _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_1__.GLUE:
        newText.space = textToken.space // i.e., default size, whatever that means for the typesetter/presenter context
        break

      default:
        console.warn(`Unsupported type in FormattedTextToken constructor: ${type}`)
        newText.type = _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_1__.EMPTY
    }
    return newText
  }

  /**
   *
   * @param {Object} someObject
   */
  static buildFromObject(someObject) {
    // console.log(`Building from object`)
    // console.log(someObject)
    if (someObject instanceof _FmtTextToken__WEBPACK_IMPORTED_MODULE_0__.FmtTextToken) {
      return this.clone(someObject)
    }
    if (someObject.type === undefined) {
      throw new Error('No type in object')
    }
    switch(someObject.type) {
      case _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_1__.TEXT:
        let newToken = new _FmtTextToken__WEBPACK_IMPORTED_MODULE_0__.FmtTextToken(_FmtTextTokenType__WEBPACK_IMPORTED_MODULE_1__.TEXT)
        if (someObject.text === undefined) {
          throw new Error('No text in object')
        }
        newToken.setText(someObject.text)
        let keysToCopy = ['verticalAlign', 'fontWeight', 'fontStyle', 'fontSize']
        keysToCopy.forEach( (key) => {
          if (someObject[key] !== undefined) {
            newToken[key] = someObject[key]
          }
        })
        return newToken

      case _FmtTextTokenType__WEBPACK_IMPORTED_MODULE_1__.GLUE:
        let glueToken = this.normalSpace()
        if (someObject.space !== undefined) {
          glueToken.space = someObject.space
        }
        return glueToken

      default:
        throw new Error(`Invalid type '${someObject.type}' in object`)
    }
  }
}

/***/ }),

/***/ "./FmtText/FmtTextTokenType.js":
/*!*************************************!*\
  !*** ./FmtText/FmtTextTokenType.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "EMPTY": () => (/* binding */ EMPTY),
/* harmony export */   "TEXT": () => (/* binding */ TEXT),
/* harmony export */   "GLUE": () => (/* binding */ GLUE)
/* harmony export */ });
/*
 *  Copyright (C) 2021 Universität zu Köln
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

const EMPTY = 'empty'
const TEXT = 'text'
const GLUE = 'glue'

/***/ }),

/***/ "./FmtText/FontSize.js":
/*!*****************************!*\
  !*** ./FmtText/FontSize.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NORMAL": () => (/* binding */ NORMAL),
/* harmony export */   "SMALL": () => (/* binding */ SMALL)
/* harmony export */ });


const NORMAL = 1
const SMALL = 0.8

/***/ }),

/***/ "./FmtText/FontStyle.js":
/*!******************************!*\
  !*** ./FmtText/FontStyle.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NORMAL": () => (/* binding */ NORMAL),
/* harmony export */   "ITALIC": () => (/* binding */ ITALIC)
/* harmony export */ });


const NORMAL = ''
const ITALIC = 'italic'

/***/ }),

/***/ "./FmtText/FontWeight.js":
/*!*******************************!*\
  !*** ./FmtText/FontWeight.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NORMAL": () => (/* binding */ NORMAL),
/* harmony export */   "BOLD": () => (/* binding */ BOLD)
/* harmony export */ });
/*
 *  Copyright (C) 2021 Universität zu Köln
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

const NORMAL = ''
const BOLD = 'bold'

/***/ }),

/***/ "./FmtText/VerticalAlign.js":
/*!**********************************!*\
  !*** ./FmtText/VerticalAlign.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BASELINE": () => (/* binding */ BASELINE),
/* harmony export */   "SUBSCRIPT": () => (/* binding */ SUBSCRIPT),
/* harmony export */   "SUPERSCRIPT": () => (/* binding */ SUPERSCRIPT)
/* harmony export */ });
/*
 *  Copyright (C) 2021 Universität zu Köln
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

const BASELINE = ''
const SUBSCRIPT = 'sub'
const SUPERSCRIPT = 'super'

/***/ }),

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
/* harmony import */ var _js_FmtText_FmtTextTokenFactory__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../js/FmtText/FmtTextTokenFactory */ "./FmtText/FmtTextTokenFactory.js");
/* harmony import */ var _js_FmtText_FmtTextToken__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../js/FmtText/FmtTextToken */ "./FmtText/FmtTextToken.js");
/* harmony import */ var _js_FmtText_FmtTextTokenType__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../js/FmtText/FmtTextTokenType */ "./FmtText/FmtTextTokenType.js");
/* harmony import */ var _js_FmtText_FmtTextFactory__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../js/FmtText/FmtTextFactory */ "./FmtText/FmtTextFactory.js");


window.ArrayUtil = _js_toolbox_ArrayUtil__WEBPACK_IMPORTED_MODULE_0__

;
window.FunctionUtil = _js_toolbox_FunctionUtil__WEBPACK_IMPORTED_MODULE_1__

;
window.FmtTextTokenFactory = _js_FmtText_FmtTextTokenFactory__WEBPACK_IMPORTED_MODULE_2__.FmtTextTokenFactory

;
window.FmtTextToken = _js_FmtText_FmtTextToken__WEBPACK_IMPORTED_MODULE_3__.FmtTextToken

;
window.FmtTextTokenType = _js_FmtText_FmtTextTokenType__WEBPACK_IMPORTED_MODULE_4__

;
window.FmtTextFactory = _js_FmtText_FmtTextFactory__WEBPACK_IMPORTED_MODULE_5__.FmtTextFactory
})();

/******/ })()
;
//# sourceMappingURL=JasmineTests.bundle.js.map