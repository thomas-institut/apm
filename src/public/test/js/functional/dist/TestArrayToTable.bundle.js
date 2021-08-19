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
/* harmony import */ var _thomas_inst_optionschecker__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @thomas-inst/optionschecker */ "../node_modules/@thomas-inst/optionschecker/OptionsChecker.mjs");
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

    let oc = new _thomas_inst_optionschecker__WEBPACK_IMPORTED_MODULE_0__.OptionsChecker({optionsDefinition: optionsDefinition, context:  "ArrayToTable"})
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

/***/ "../node_modules/@thomas-inst/optionschecker/OptionsChecker.mjs":
/*!**********************************************************************!*\
  !*** ../node_modules/@thomas-inst/optionschecker/OptionsChecker.mjs ***!
  \**********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "OptionsChecker": () => (/* binding */ OptionsChecker)
/* harmony export */ });
/*
 *  Copyright (C) 2019-2021 Universität zu Köln
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
 */

class OptionsChecker {

    /**
     * Constructs an OptionsChecker object.
     *
     * If the constructor is called with only one argument, the argument is meant to be
     * an object with the following properties:
     *  {
     *      optionsDefinition:  <an object as described below; required>
     *      context: <a string used to identify the checker in warning and error messages; required>
     *      strictDefault: <true|false, if true, options default will only be used when an option it not defined, can be overridden in any option definition>
     *      verbose: <true|false, if true, warnings and error will be logged to the console; default: false>
     *      debug: <true|false, if true, verbose mode will be turned on and more info will be logged to the console; default: false>
     *  }
     *
     * Calling the constructor with multiple arguments will be deprecated in the next version.  The arguments will be transformed
     * into an object like the one above:
     *  {
     *      optionsDefinition: arg1
     *      context: arg2
     *      verbose: arg3  (default false)
     *  }
     *
     * The optionsDefinition object  should have as properties the
     * definition of each option to be checked. Each property, in turn, should have the following
     * properties:
     *
     *   optionName:  {
     *     required: <true/false>  // optional, if not present it defaults to false (i.e., the option is not required)
     *     default:  <default Value> // if required===true, the default value will be ignored
     *     strictDefault: <true|false> // if true, the default will only be used if the option is not defined, overrides the global strictDefault flag
     *     type: 'type_string'   // optional type requirement for the option
     *         type_string can be a Javascript type name:  'string', 'number', 'object', 'boolean', 'function'
     *         it can also be one of the following:
     *             'NonEmptyString'
     *             'NumberGreaterThanZero'
     *             'NonZeroNumber'
     *             'Array' | 'array'
     *             'custom'   // no checks done, meant to be used with a customCheck function
     *
     *     // Additional checks
     *     customCheck: function  (valueToCheck) =>  { ... return true|false }, a function that performs an additional check on a value
     *     customCheckDescription: 'some description', a string used to report failures from the checker function
     *
     *     // Objects
     *     objectClass: SomeClass // if present and type==='object', the given value is checked to be a instance of this class
     *     objectDefinition: <object> // if present and type==='object', the property will be checked against the given definition
     *
     *     // Arrays
     *     minLength: <number>
     *     maxLength: <number>
     *     elementDefinition: <object> // if present and type === 'array', each element in the array will be checked against the given definition
     *
     *     // strings
     *     minLength: <number>
     *     maxLength: <number>
     *
     *     // numbers
     *     min: <number>
     *     max: <number>
     *
     *    // value transformation (e.g. normalization)
     *    transformFunction: (val) => { return <value to assign>}   // applied after all checks, but not to given defaults
     *   }
     *
     * @param {object} constructorOptions
     * @param {null|string} contextStr  id string to use in exceptions, errors and warnings
     * @param {boolean} verbose  if true, errors and warnings will be reported in the console
     */
    constructor(constructorOptions, contextStr= null, verbose=false) {

        let constructorOptionsObject = constructorOptions
        if (contextStr !== null) {
            console.warn(`Initializing OptionsChecker with multiple arguments will be deprecated in the next version. Context: ${contextStr}`)
            // this means the old style call
            constructorOptionsObject = {
                optionsDefinition: constructorOptions,
                context: contextStr,
                verbose: verbose
            }
        }

        let checkerOptionsDefinition = {
            optionsDefinition: { type: 'object', required: true},
            context: { type: 'NonEmptyString', required: true},
            strictDefault: { type: 'boolean', default: false},
            verbose: { type: 'boolean', default: false},
            debug: { type: 'boolean', default: false}
        }
        let  cleanOptions = _getCleanOptions(constructorOptionsObject, checkerOptionsDefinition, `${contextStr === null ? 'OptionsChecker' : contextStr} constructor`, false, false, true)

        this.optionsDefinition = cleanOptions.optionsDefinition
        this.contextStr = cleanOptions.context
        this.verbose = cleanOptions.verbose
        this.strictDefault = cleanOptions.strictDefault
        this.setDebug(cleanOptions.debug)
    }

    setDebug(debug) {
        if (debug) {
            this.debug = true
            this.verbose = true
        } else {
            this.debug = false
        }
    }

    /**
     *
     * @param {object} optionsObject
     * @return {object}
     *
     */
    getCleanOptions(optionsObject) {
       return _getCleanOptions(optionsObject, this.optionsDefinition, this.contextStr, this.verbose, this.debug, this.strictDefault)
    }

    getDefaults() {
        return this.getCleanOptions({})
    }
}

function _normalizeTypeString(typeStr) {
    let type = typeStr.toLowerCase()

    switch(type) {
        case 'bool':
            return 'boolean'

        case 'func':
            return 'function'

        case 'nonemptystring':
            return 'NonEmptyString'

        case 'numbergreaterthanzero':
            return 'NumberGreaterThanZero'

        case 'nonzeronumber':
            return 'NonZeroNumber'

    }
    return type
}
function sPrettyPrint(value) {
    switch (typeof (value)) {
        case 'string':
            return `'${value}'`
        case 'object':
            if (Array.isArray(value)) {
                return `[Array]`
            }
            if (value.constructor.name !== 'Object') {
                return `[${value.constructor.name}]`
            }
            return '[Object]'
        default:
            return `${value}`
    }
}

function _getCleanOptions(optionsObject, optionsDefinition, contextStr, verbose, debug, strictDefault) {
    debug && console.log(`Getting clean options for context '${contextStr}'`)
    let cleanOptions = {}
    for (const optionName in optionsDefinition) {
        if (!optionsDefinition.hasOwnProperty(optionName)) {
            debug && console.log(`Ignoring property ${optionName}, which is not an own property of the optionsDefinition object`)
            continue
        }
        let optionDefinition = optionsDefinition[optionName]
        debug && console.log(`Checking option '${optionName}'`)
        debug && console.log(`Definition:`)
        debug && console.log(optionDefinition)
        debug && console.log(`Value to check:`)
        debug && console.log(optionsObject[optionName])
        if (optionsObject[optionName] === undefined) {
            // optionName is NOT in optionsObject
            if (optionDefinition.required) {
                _throwError(`Required option '${optionName}' not found`, contextStr, verbose)
            }
            if (optionDefinition.default === undefined) {
                _throwError(`No default defined for option '${optionName}'`, contextStr, verbose)
            }
            debug && console.log(`Assigning default`)
            cleanOptions[optionName] = optionDefinition.default
            continue;
        }
        // optionName is present in optionsObject
        // check type
        if (optionDefinition.type === undefined) {
            // no type given, nothing else to do
            continue
        }
        if (typeof optionDefinition.type !== 'string' || optionDefinition.type === '') {
            // bad type given
            _throwError(`Invalid type in definition for ${optionName}, need a non-empty string, ${sPrettyPrint(optionDefinition.type)} given`,
                contextStr, verbose)
        }
        // pre-process type
        let definitionType = _normalizeTypeString(optionDefinition.type)
        switch(definitionType) {
            case 'NonEmptyString':
                definitionType = 'string'
                optionDefinition.type = 'string'
                optionDefinition.minLength = 1
                optionDefinition.maxLength = undefined
                break
        }
        debug && console.log(`Normalized definition type: '${definitionType}'`)

        let checkFail = false
        let checkFailMessage = ''
        let cleanValueAssigned = false

        switch(definitionType)  {
            case 'function':
            case 'boolean':
                if (typeof optionsObject[optionName] !== definitionType) {
                    checkFail = true
                    checkFailMessage = `${optionName} should be a ${optionDefinition.type}, ${sPrettyPrint(typeof optionsObject[optionName])} given`
                }
                break

            case 'number':
                if (typeof(optionsObject[optionName]) === 'number') {
                    if (optionDefinition['min'] !== undefined) {
                        if (optionsObject[optionName] < optionDefinition['min']) {
                            checkFail = true
                            checkFailMessage = `Number '${optionName}' should be equal to or greater than ${optionDefinition['min']}, ${optionsObject[optionName]} given`
                        }
                    }
                    if (optionDefinition['max'] !== undefined) {
                        if (optionsObject[optionName] > optionDefinition['max']) {
                            checkFail = true
                            checkFailMessage = `Number '${optionName}' should be equal to or lesser than ${optionDefinition['max']}, ${optionsObject[optionName]} given`
                        }
                    }
                } else {
                    checkFail = true
                    checkFailMessage = `${optionName} should be a number, ${sPrettyPrint(typeof optionsObject[optionName])} given`
                }
                break

            case 'NonEmptyString':
                if (typeof optionsObject[optionName] !== 'string' || optionsObject[optionName] === '') {
                    checkFail = true
                    checkFailMessage = `${optionName} should be a non-empty string, ${sPrettyPrint(optionsObject[optionName])} given`
                }
                break


            case 'NumberGreaterThanZero':
                if (typeof optionsObject[optionName] !== 'number' || optionsObject[optionName] <= 0) {
                    checkFail = true
                    checkFailMessage = `${optionName} should be a number greater than zero, ${sPrettyPrint(optionsObject[optionName])} given`
                }
                break

            case 'NonZeroNumber':
                if (typeof optionsObject[optionName] !== 'number' || optionsObject[optionName] === 0) {
                    checkFail = true
                    checkFailMessage = `${optionName} should be a number not equal to zero, ${sPrettyPrint(optionsObject[optionName])} given`
                }
                break

            case 'string':
                if (typeof optionsObject[optionName] !== 'string') {
                    checkFail = true
                    checkFailMessage = `${optionName} should be a string, ${sPrettyPrint(typeof optionsObject[optionName])} given`
                    break
                }
                if (optionDefinition['minLength'] !== undefined) {
                    if (optionsObject[optionName].length < optionDefinition['minLength']) {
                        checkFail = true
                        checkFailMessage = `String '${optionName}' should be at least ${optionDefinition['minLength']} characters(s) long, it has ${optionsObject[optionName].length}`
                    }
                }
                if (optionDefinition['maxLength'] !== undefined) {
                    if (optionsObject[optionName].length > optionDefinition['maxLength']) {
                        checkFail = true
                        checkFailMessage = `String '${optionName}' should not have more than ${optionDefinition['maxLength']} character(s), it has ${optionsObject[optionName].length}`
                    }
                }
                break

            case 'object':
                if (typeof optionsObject[optionName] !== 'object') {
                    checkFail = true
                    checkFailMessage = `${optionName} must be an object, ${sPrettyPrint(typeof optionsObject[optionName])} given`
                    break
                }
                // if we have an objectClass, check for it
                if (optionDefinition['objectClass'] !== undefined) {
                    if (!(optionsObject[optionName] instanceof optionDefinition['objectClass'])) {
                        checkFail = true
                        checkFailMessage = `${optionName} must be an object of class ${optionDefinition['objectClass'].name},` +
                            ` ${optionsObject[optionName].constructor.name} given, will assign default`
                        break
                    }
                }
                // if there's an object definition, check it
                if (optionDefinition['objectDefinition'] !== undefined) {
                    let newOc = new OptionsChecker({
                        optionsDefinition: optionDefinition['objectDefinition'],
                        context:  `${contextStr} : ${optionName}`,
                        verbose: verbose,
                        debug: debug
                    })
                    let cleanObject = {}
                    try {
                        cleanObject = newOc.getCleanOptions(optionsObject[optionName])
                    } catch (e) {
                        checkFail = true
                        checkFailMessage = e
                    }
                    // if we get here newOc.getCleanOptions ran fine
                    if (!checkFail) {
                        cleanOptions[optionName] = cleanObject
                        cleanValueAssigned = true
                    }
                }
                break

            case 'array':
                if (!Array.isArray(optionsObject[optionName])) {
                    checkFail = true
                    checkFailMessage = `${optionName} must be an array, ${sPrettyPrint(typeof optionsObject[optionName])} given`
                    break
                }
                if (optionDefinition['minLength'] !== undefined && optionsObject[optionName].length < optionDefinition['minLength']) {
                    checkFail = true
                    checkFailMessage = `Array '${optionName}' should have at least ${optionDefinition['minLength']} element(s), it has ${optionsObject[optionName].length}`
                    break
                }
                if (optionDefinition['maxLength'] !== undefined && optionsObject[optionName].length > optionDefinition['maxLength']) {
                    checkFail = true
                    checkFailMessage =`Array '${optionName}' should not have more than ${optionDefinition['maxLength']} element(s), it has ${optionsObject[optionName].length}`
                }

                if (optionDefinition['elementDefinition'] !== undefined) {
                    // apply the definition to every element in the array
                    try {
                        cleanOptions[optionName] = optionsObject[optionName].map((ele, i) => {

                            let newOc = new OptionsChecker( {
                                optionsDefinition: { element: optionDefinition['elementDefinition'] },
                                context: `${contextStr} : ${optionName} : element ${i}`,
                                verbose: verbose,
                                debug: debug })
                            return newOc.getCleanOptions( { element: ele})['element']
                        })
                    } catch (e) {
                        checkFail = true
                        checkFailMessage = e
                    }
                    if (!checkFail) {
                        cleanValueAssigned = true
                    }
                }
                break

            case 'custom':
                // do nothing, will perform custom checker function later
                break

            default:
                _throwError(`Unrecognized type '${optionDefinition.type}' in the definition of '${optionName}'`, contextStr, verbose)
        }

        // Perform extra check if no errors found
        if (!checkFail && optionDefinition.customCheck !== undefined) {
            if (!optionDefinition.customCheck(optionsObject[optionName])) {
                // custom check fails
                checkFail = true
                checkFailMessage = `${optionName} must be ${optionDefinition.customCheckDescription}, ` +
                    `${sPrettyPrint(optionsObject[optionName])} given`
            }
        }

        if (checkFail) {
            let optionStrictDefault = optionDefinition.strictDefault !== undefined ? optionDefinition.strictDefault : strictDefault

            if (optionStrictDefault || optionDefinition.default === undefined) {
                _throwError(checkFailMessage, contextStr, verbose)
            }
            else {
                verbose && console.warn(`${checkFailMessage}. Default assigned.`)
                cleanOptions[optionName] = optionDefinition.default
            }
        } else {
            if (!cleanValueAssigned) {
                cleanOptions[optionName] = optionsObject[optionName]
            }
            // apply transform function, if there's any
            if (optionDefinition['transformFunction'] !== undefined && typeof(optionDefinition['transformFunction']) === 'function') {
                debug && console.log(`Applying transform function`)
                cleanOptions[optionName] = optionDefinition['transformFunction'](cleanOptions[optionName])
                if (cleanOptions[optionName] === undefined) {
                    _throwError(`Transform function returned undefined value for option ${optionName}`, contextStr, verbose)
                }
            }
        }

    }
    return cleanOptions;
}


function _throwError(message, context, verbose) {
    let errorMessage = `${context} : ${message}`
    verbose && console.error(errorMessage)
    throw new Error(errorMessage)
}

/***/ }),

/***/ "../node_modules/css-loader/dist/cjs.js!../test/js/functional/test-array-to-table.css":
/*!********************************************************************************************!*\
  !*** ../node_modules/css-loader/dist/cjs.js!../test/js/functional/test-array-to-table.css ***!
  \********************************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../node_modules/css-loader/dist/runtime/cssWithMappingToString.js */ "../node_modules/css-loader/dist/runtime/cssWithMappingToString.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../node_modules/css-loader/dist/runtime/api.js */ "../node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, "\n.test-class {\n    color: fuchsia;\n}\n\ntable.number-table {\n    margin: 1rem;\n}\ntable.number-table td {\n    text-align: right;\n    padding: 5px;\n    border: 1px solid #f8eaea;\n}\n.rank-0 {\n    color: silver;\n}\n\n.rank-1 {\n    color: gray;\n}\n\n.rank-3 {\n    color: darkcyan;\n}\n\n.rank-4 {\n    color: darkolivegreen;\n}\n\n.rank-5 {\n    color: green;\n}\n\n.rank-6 {\n    color: darkmagenta;\n}\n\n.rank-8 {\n    color: darkred;\n}\n\n.rank-9 {\n    color: red;\n}\n\n.odd-row {\n    background-color: ivory;\n}", "",{"version":3,"sources":["webpack://./../test/js/functional/test-array-to-table.css"],"names":[],"mappings":";AACA;IACI,cAAc;AAClB;;AAEA;IACI,YAAY;AAChB;AACA;IACI,iBAAiB;IACjB,YAAY;IACZ,yBAAyB;AAC7B;AACA;IACI,aAAa;AACjB;;AAEA;IACI,WAAW;AACf;;AAEA;IACI,eAAe;AACnB;;AAEA;IACI,qBAAqB;AACzB;;AAEA;IACI,YAAY;AAChB;;AAEA;IACI,kBAAkB;AACtB;;AAEA;IACI,cAAc;AAClB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,uBAAuB;AAC3B","sourcesContent":["\n.test-class {\n    color: fuchsia;\n}\n\ntable.number-table {\n    margin: 1rem;\n}\ntable.number-table td {\n    text-align: right;\n    padding: 5px;\n    border: 1px solid #f8eaea;\n}\n.rank-0 {\n    color: silver;\n}\n\n.rank-1 {\n    color: gray;\n}\n\n.rank-3 {\n    color: darkcyan;\n}\n\n.rank-4 {\n    color: darkolivegreen;\n}\n\n.rank-5 {\n    color: green;\n}\n\n.rank-6 {\n    color: darkmagenta;\n}\n\n.rank-8 {\n    color: darkred;\n}\n\n.rank-9 {\n    color: red;\n}\n\n.odd-row {\n    background-color: ivory;\n}"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "../node_modules/css-loader/dist/runtime/api.js":
/*!******************************************************!*\
  !*** ../node_modules/css-loader/dist/runtime/api.js ***!
  \******************************************************/
/***/ ((module) => {



/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
// eslint-disable-next-line func-names
module.exports = function (cssWithMappingToString) {
  var list = []; // return the list of modules as css string

  list.toString = function toString() {
    return this.map(function (item) {
      var content = cssWithMappingToString(item);

      if (item[2]) {
        return "@media ".concat(item[2], " {").concat(content, "}");
      }

      return content;
    }).join("");
  }; // import a list of modules into the list
  // eslint-disable-next-line func-names


  list.i = function (modules, mediaQuery, dedupe) {
    if (typeof modules === "string") {
      // eslint-disable-next-line no-param-reassign
      modules = [[null, modules, ""]];
    }

    var alreadyImportedModules = {};

    if (dedupe) {
      for (var i = 0; i < this.length; i++) {
        // eslint-disable-next-line prefer-destructuring
        var id = this[i][0];

        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }

    for (var _i = 0; _i < modules.length; _i++) {
      var item = [].concat(modules[_i]);

      if (dedupe && alreadyImportedModules[item[0]]) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (mediaQuery) {
        if (!item[2]) {
          item[2] = mediaQuery;
        } else {
          item[2] = "".concat(mediaQuery, " and ").concat(item[2]);
        }
      }

      list.push(item);
    }
  };

  return list;
};

/***/ }),

/***/ "../node_modules/css-loader/dist/runtime/cssWithMappingToString.js":
/*!*************************************************************************!*\
  !*** ../node_modules/css-loader/dist/runtime/cssWithMappingToString.js ***!
  \*************************************************************************/
/***/ ((module) => {



function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

module.exports = function cssWithMappingToString(item) {
  var _item = _slicedToArray(item, 4),
      content = _item[1],
      cssMapping = _item[3];

  if (typeof btoa === "function") {
    // eslint-disable-next-line no-undef
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    var sourceURLs = cssMapping.sources.map(function (source) {
      return "/*# sourceURL=".concat(cssMapping.sourceRoot || "").concat(source, " */");
    });
    return [content].concat(sourceURLs).concat([sourceMapping]).join("\n");
  }

  return [content].join("\n");
};

/***/ }),

/***/ "../test/js/functional/test-array-to-table.css":
/*!*****************************************************!*\
  !*** ../test/js/functional/test-array-to-table.css ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_test_array_to_table_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !!../../../node_modules/css-loader/dist/cjs.js!./test-array-to-table.css */ "../node_modules/css-loader/dist/cjs.js!../test/js/functional/test-array-to-table.css");

            

var options = {};

options.insert = "head";
options.singleton = false;

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_test_array_to_table_css__WEBPACK_IMPORTED_MODULE_1__.default, options);



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_test_array_to_table_css__WEBPACK_IMPORTED_MODULE_1__.default.locals || {});

/***/ }),

/***/ "../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!*****************************************************************************!*\
  !*** ../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \*****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var isOldIE = function isOldIE() {
  var memo;
  return function memorize() {
    if (typeof memo === 'undefined') {
      // Test for IE <= 9 as proposed by Browserhacks
      // @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
      // Tests for existence of standard globals is to allow style-loader
      // to operate correctly into non-standard environments
      // @see https://github.com/webpack-contrib/style-loader/issues/177
      memo = Boolean(window && document && document.all && !window.atob);
    }

    return memo;
  };
}();

var getTarget = function getTarget() {
  var memo = {};
  return function memorize(target) {
    if (typeof memo[target] === 'undefined') {
      var styleTarget = document.querySelector(target); // Special case to return head of iframe instead of iframe itself

      if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
        try {
          // This will throw an exception if access to iframe is blocked
          // due to cross-origin restrictions
          styleTarget = styleTarget.contentDocument.head;
        } catch (e) {
          // istanbul ignore next
          styleTarget = null;
        }
      }

      memo[target] = styleTarget;
    }

    return memo[target];
  };
}();

var stylesInDom = [];

function getIndexByIdentifier(identifier) {
  var result = -1;

  for (var i = 0; i < stylesInDom.length; i++) {
    if (stylesInDom[i].identifier === identifier) {
      result = i;
      break;
    }
  }

  return result;
}

function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var index = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3]
    };

    if (index !== -1) {
      stylesInDom[index].references++;
      stylesInDom[index].updater(obj);
    } else {
      stylesInDom.push({
        identifier: identifier,
        updater: addStyle(obj, options),
        references: 1
      });
    }

    identifiers.push(identifier);
  }

  return identifiers;
}

function insertStyleElement(options) {
  var style = document.createElement('style');
  var attributes = options.attributes || {};

  if (typeof attributes.nonce === 'undefined') {
    var nonce =  true ? __webpack_require__.nc : 0;

    if (nonce) {
      attributes.nonce = nonce;
    }
  }

  Object.keys(attributes).forEach(function (key) {
    style.setAttribute(key, attributes[key]);
  });

  if (typeof options.insert === 'function') {
    options.insert(style);
  } else {
    var target = getTarget(options.insert || 'head');

    if (!target) {
      throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
    }

    target.appendChild(style);
  }

  return style;
}

function removeStyleElement(style) {
  // istanbul ignore if
  if (style.parentNode === null) {
    return false;
  }

  style.parentNode.removeChild(style);
}
/* istanbul ignore next  */


var replaceText = function replaceText() {
  var textStore = [];
  return function replace(index, replacement) {
    textStore[index] = replacement;
    return textStore.filter(Boolean).join('\n');
  };
}();

function applyToSingletonTag(style, index, remove, obj) {
  var css = remove ? '' : obj.media ? "@media ".concat(obj.media, " {").concat(obj.css, "}") : obj.css; // For old IE

  /* istanbul ignore if  */

  if (style.styleSheet) {
    style.styleSheet.cssText = replaceText(index, css);
  } else {
    var cssNode = document.createTextNode(css);
    var childNodes = style.childNodes;

    if (childNodes[index]) {
      style.removeChild(childNodes[index]);
    }

    if (childNodes.length) {
      style.insertBefore(cssNode, childNodes[index]);
    } else {
      style.appendChild(cssNode);
    }
  }
}

function applyToTag(style, options, obj) {
  var css = obj.css;
  var media = obj.media;
  var sourceMap = obj.sourceMap;

  if (media) {
    style.setAttribute('media', media);
  } else {
    style.removeAttribute('media');
  }

  if (sourceMap && typeof btoa !== 'undefined') {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  } // For old IE

  /* istanbul ignore if  */


  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    while (style.firstChild) {
      style.removeChild(style.firstChild);
    }

    style.appendChild(document.createTextNode(css));
  }
}

var singleton = null;
var singletonCounter = 0;

function addStyle(obj, options) {
  var style;
  var update;
  var remove;

  if (options.singleton) {
    var styleIndex = singletonCounter++;
    style = singleton || (singleton = insertStyleElement(options));
    update = applyToSingletonTag.bind(null, style, styleIndex, false);
    remove = applyToSingletonTag.bind(null, style, styleIndex, true);
  } else {
    style = insertStyleElement(options);
    update = applyToTag.bind(null, style, options);

    remove = function remove() {
      removeStyleElement(style);
    };
  }

  update(obj);
  return function updateStyle(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap) {
        return;
      }

      update(obj = newObj);
    } else {
      remove();
    }
  };
}

module.exports = function (list, options) {
  options = options || {}; // Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
  // tags it will allow on a page

  if (!options.singleton && typeof options.singleton !== 'boolean') {
    options.singleton = isOldIE();
  }

  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];

    if (Object.prototype.toString.call(newList) !== '[object Array]') {
      return;
    }

    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDom[index].references--;
    }

    var newLastIdentifiers = modulesToDom(newList, options);

    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];

      var _index = getIndexByIdentifier(_identifier);

      if (stylesInDom[_index].references === 0) {
        stylesInDom[_index].updater();

        stylesInDom.splice(_index, 1);
      }
    }

    lastIdentifiers = newLastIdentifiers;
  };
};

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
/******/ 			id: moduleId,
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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
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
/* harmony import */ var _test_array_to_table_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./test-array-to-table.css */ "../test/js/functional/test-array-to-table.css");
/* harmony import */ var _js_toolbox_ArrayToTable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../js/toolbox/ArrayToTable */ "./toolbox/ArrayToTable.js");





$( () => {
  const selector = '#the-table'

  const numItems = 150

  let data = []
  for (let i = 0; i < numItems; i++) {
    data.push(Math.round(Math.random()*10000))
  }

  let a2t = new _js_toolbox_ArrayToTable__WEBPACK_IMPORTED_MODULE_1__.ArrayToTable({
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
//# sourceMappingURL=TestArrayToTable.bundle.js.map