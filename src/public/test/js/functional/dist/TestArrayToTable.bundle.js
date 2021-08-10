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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi90b29sYm94L0FycmF5VG9UYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi4vbm9kZV9tb2R1bGVzL0B0aG9tYXMtaW5zdC9vcHRpb25zY2hlY2tlci9PcHRpb25zQ2hlY2tlci5tanMiLCJ3ZWJwYWNrOi8vLy4uL3Rlc3QvanMvZnVuY3Rpb25hbC90ZXN0LWFycmF5LXRvLXRhYmxlLmNzcyIsIndlYnBhY2s6Ly8vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qcyIsIndlYnBhY2s6Ly8vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2Nzc1dpdGhNYXBwaW5nVG9TdHJpbmcuanMiLCJ3ZWJwYWNrOi8vLy4uL3Rlc3QvanMvZnVuY3Rpb25hbC90ZXN0LWFycmF5LXRvLXRhYmxlLmNzcz80MDIxIiwid2VicGFjazovLy8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanMiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovLy93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly8vd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovLy93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovLy93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovLy8uLi90ZXN0L2pzL2Z1bmN0aW9uYWwvVGVzdEFycmF5VG9UYWJsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7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QUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQSxDQUFDLEMiLCJmaWxlIjoiLi4vLi4vdGVzdC9qcy9mdW5jdGlvbmFsL2Rpc3QvVGVzdEFycmF5VG9UYWJsZS5idW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogIENvcHlyaWdodCAoQykgMjAyMCBVbml2ZXJzaXTDpHQgenUgS8O2bG5cbiAqXG4gKiAgVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAgKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiAgVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiAgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiAgWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqICBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS4gIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKlxuICovXG5cbmltcG9ydCB7T3B0aW9uc0NoZWNrZXJ9IGZyb20gJ0B0aG9tYXMtaW5zdC9vcHRpb25zY2hlY2tlcidcblxuZXhwb3J0IGNsYXNzIEFycmF5VG9UYWJsZSB7XG5cbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBsZXQgb3B0aW9uc0RlZmluaXRpb24gPSB7XG4gICAgICBpdGVtc1BlclJvdzogeyB0eXBlOiAnTm9uWmVyb051bWJlcicsIGRlZmF1bHQ6IDIwfSxcbiAgICAgIHRhYmxlQ2xhc3NlczogeyB0eXBlOiAnYXJyYXknLCBkZWZhdWx0OiBbXX0sXG4gICAgICB0ZENsYXNzZXM6IHsgdHlwZTogJ2FycmF5JywgZGVmYXVsdDogW119LFxuICAgICAgdHJDbGFzc2VzOiB7IHR5cGU6ICdhcnJheScsIGRlZmF1bHQ6IFtdfSxcbiAgICAgIGdldFRyQ2xhc3NlczogeyB0eXBlOiAnZnVuY3Rpb24nLCBkZWZhdWx0OiAocm93TnVtYmVyLCBmaXJzdEl0ZW1JbmRleCkgPT4ge3JldHVybiBbXX19LFxuICAgICAgZ2V0VGRDbGFzc2VzOiB7IHR5cGU6ICdmdW5jdGlvbicsIGRlZmF1bHQ6IChpdGVtLCBpbmRleCkgPT4ge3JldHVybiBbXX19LFxuICAgICAgZ2V0VGRDb250ZW50OiB7IHR5cGU6ICdmdW5jdGlvbicsIGRlZmF1bHQ6IChpdGVtLCBpbmRleCkgPT4geyByZXR1cm4gaXRlbS50b1N0cmluZygpfX0sXG4gICAgICBkYXRhOiB7IHR5cGU6ICdhcnJheScsIGRlZmF1bHQ6IFtdfSxcbiAgICB9XG5cbiAgICBsZXQgb2MgPSBuZXcgT3B0aW9uc0NoZWNrZXIoe29wdGlvbnNEZWZpbml0aW9uOiBvcHRpb25zRGVmaW5pdGlvbiwgY29udGV4dDogIFwiQXJyYXlUb1RhYmxlXCJ9KVxuICAgIHRoaXMub3B0aW9ucyA9IG9jLmdldENsZWFuT3B0aW9ucyhvcHRpb25zKVxuXG5cbiAgICB0aGlzLmRhdGEgPSB0aGlzLm9wdGlvbnMuZGF0YVxuXG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIG5ld0RhdGEgYXJyYXlcbiAgICovXG4gIHNldERhdGEobmV3RGF0YSkge1xuICAgIHRoaXMuZGF0YSA9IG5ld0RhdGFcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBsZXQgaHRtbCA9ICcnXG4gICAgbGV0IG51bVJvd3MgPSBNYXRoLmNlaWwodGhpcy5kYXRhLmxlbmd0aCAvIHRoaXMub3B0aW9ucy5pdGVtc1BlclJvdylcbiAgICBodG1sICs9IGA8dGFibGUgJHt0aGlzLmdlbkNsYXNzU3RhdGVtZW50KHRoaXMub3B0aW9ucy50YWJsZUNsYXNzZXMpfT5gXG4gICAgZm9yIChsZXQgcm93ID0gMDsgcm93IDwgbnVtUm93czsgcm93KyspIHtcbiAgICAgIGxldCBmaXJzdEl0ZW1JbmRleEluUm93ID0gcm93KnRoaXMub3B0aW9ucy5pdGVtc1BlclJvd1xuICAgICAgbGV0IGxhc3RJdGVtSW5kZXhJblJvdyA9IChyb3cgKyAxKSp0aGlzLm9wdGlvbnMuaXRlbXNQZXJSb3cgLSAxXG4gICAgICBpZiAobGFzdEl0ZW1JbmRleEluUm93ID49IHRoaXMuZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgbGFzdEl0ZW1JbmRleEluUm93ID0gdGhpcy5kYXRhLmxlbmd0aCAtIDFcbiAgICAgIH1cbiAgICAgIGh0bWwgKz0gYDx0ciAke3RoaXMuZ2VuQ2xhc3NTdGF0ZW1lbnQodGhpcy5vcHRpb25zLmdldFRyQ2xhc3Nlcyhyb3csIGZpcnN0SXRlbUluZGV4SW5Sb3cpKX0+YFxuICAgICAgZm9yIChsZXQgaW5kZXggPSBmaXJzdEl0ZW1JbmRleEluUm93OyBpbmRleCA8PSBsYXN0SXRlbUluZGV4SW5Sb3c7IGluZGV4KyspIHtcbiAgICAgICAgaHRtbCArPWA8dGQgJHt0aGlzLmdlbkNsYXNzU3RhdGVtZW50KHRoaXMub3B0aW9ucy5nZXRUZENsYXNzZXModGhpcy5kYXRhW2luZGV4XSwgaW5kZXgpKX0+JHt0aGlzLm9wdGlvbnMuZ2V0VGRDb250ZW50KHRoaXMuZGF0YVtpbmRleF0sIGluZGV4KX08L3RkPmBcbiAgICAgIH1cbiAgICAgIGh0bWwgKz0gJzwvdGQ+J1xuICAgIH1cbiAgICBodG1sKz0gJzwvdGFibGU+J1xuICAgIHJldHVybiBodG1sXG4gIH1cblxuICBnZW5DbGFzc1N0YXRlbWVudChjbGFzc2VzKSB7XG4gICAgaWYgKGNsYXNzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gJydcbiAgICB9XG4gICAgcmV0dXJuIGBjbGFzcz1cIiR7Y2xhc3Nlcy5qb2luKCcgJyl9XCJgXG4gIH1cbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChDKSAyMDE5LTIwMjEgVW5pdmVyc2l0w6R0IHp1IEvDtmxuXG4gKlxuICogIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiAgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiAgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uICBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICpcbiAqL1xuXG4vKipcbiAqIFV0aWxpdHkgY2xhc3MgdG8gY2hlY2sgYW5kIGdlbmVyYXRlIGEgXCJjbGVhblwiICBvcHRpb25zIG9iamVjdFxuICovXG5cbmV4cG9ydCBjbGFzcyBPcHRpb25zQ2hlY2tlciB7XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGFuIE9wdGlvbnNDaGVja2VyIG9iamVjdC5cbiAgICAgKlxuICAgICAqIElmIHRoZSBjb25zdHJ1Y3RvciBpcyBjYWxsZWQgd2l0aCBvbmx5IG9uZSBhcmd1bWVudCwgdGhlIGFyZ3VtZW50IGlzIG1lYW50IHRvIGJlXG4gICAgICogYW4gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgICAqICB7XG4gICAgICogICAgICBvcHRpb25zRGVmaW5pdGlvbjogIDxhbiBvYmplY3QgYXMgZGVzY3JpYmVkIGJlbG93OyByZXF1aXJlZD5cbiAgICAgKiAgICAgIGNvbnRleHQ6IDxhIHN0cmluZyB1c2VkIHRvIGlkZW50aWZ5IHRoZSBjaGVja2VyIGluIHdhcm5pbmcgYW5kIGVycm9yIG1lc3NhZ2VzOyByZXF1aXJlZD5cbiAgICAgKiAgICAgIHN0cmljdERlZmF1bHQ6IDx0cnVlfGZhbHNlLCBpZiB0cnVlLCBvcHRpb25zIGRlZmF1bHQgd2lsbCBvbmx5IGJlIHVzZWQgd2hlbiBhbiBvcHRpb24gaXQgbm90IGRlZmluZWQsIGNhbiBiZSBvdmVycmlkZGVuIGluIGFueSBvcHRpb24gZGVmaW5pdGlvbj5cbiAgICAgKiAgICAgIHZlcmJvc2U6IDx0cnVlfGZhbHNlLCBpZiB0cnVlLCB3YXJuaW5ncyBhbmQgZXJyb3Igd2lsbCBiZSBsb2dnZWQgdG8gdGhlIGNvbnNvbGU7IGRlZmF1bHQ6IGZhbHNlPlxuICAgICAqICAgICAgZGVidWc6IDx0cnVlfGZhbHNlLCBpZiB0cnVlLCB2ZXJib3NlIG1vZGUgd2lsbCBiZSB0dXJuZWQgb24gYW5kIG1vcmUgaW5mbyB3aWxsIGJlIGxvZ2dlZCB0byB0aGUgY29uc29sZTsgZGVmYXVsdDogZmFsc2U+XG4gICAgICogIH1cbiAgICAgKlxuICAgICAqIENhbGxpbmcgdGhlIGNvbnN0cnVjdG9yIHdpdGggbXVsdGlwbGUgYXJndW1lbnRzIHdpbGwgYmUgZGVwcmVjYXRlZCBpbiB0aGUgbmV4dCB2ZXJzaW9uLiAgVGhlIGFyZ3VtZW50cyB3aWxsIGJlIHRyYW5zZm9ybWVkXG4gICAgICogaW50byBhbiBvYmplY3QgbGlrZSB0aGUgb25lIGFib3ZlOlxuICAgICAqICB7XG4gICAgICogICAgICBvcHRpb25zRGVmaW5pdGlvbjogYXJnMVxuICAgICAqICAgICAgY29udGV4dDogYXJnMlxuICAgICAqICAgICAgdmVyYm9zZTogYXJnMyAgKGRlZmF1bHQgZmFsc2UpXG4gICAgICogIH1cbiAgICAgKlxuICAgICAqIFRoZSBvcHRpb25zRGVmaW5pdGlvbiBvYmplY3QgIHNob3VsZCBoYXZlIGFzIHByb3BlcnRpZXMgdGhlXG4gICAgICogZGVmaW5pdGlvbiBvZiBlYWNoIG9wdGlvbiB0byBiZSBjaGVja2VkLiBFYWNoIHByb3BlcnR5LCBpbiB0dXJuLCBzaG91bGQgaGF2ZSB0aGUgZm9sbG93aW5nXG4gICAgICogcHJvcGVydGllczpcbiAgICAgKlxuICAgICAqICAgb3B0aW9uTmFtZTogIHtcbiAgICAgKiAgICAgcmVxdWlyZWQ6IDx0cnVlL2ZhbHNlPiAgLy8gb3B0aW9uYWwsIGlmIG5vdCBwcmVzZW50IGl0IGRlZmF1bHRzIHRvIGZhbHNlIChpLmUuLCB0aGUgb3B0aW9uIGlzIG5vdCByZXF1aXJlZClcbiAgICAgKiAgICAgZGVmYXVsdDogIDxkZWZhdWx0IFZhbHVlPiAvLyBpZiByZXF1aXJlZD09PXRydWUsIHRoZSBkZWZhdWx0IHZhbHVlIHdpbGwgYmUgaWdub3JlZFxuICAgICAqICAgICBzdHJpY3REZWZhdWx0OiA8dHJ1ZXxmYWxzZT4gLy8gaWYgdHJ1ZSwgdGhlIGRlZmF1bHQgd2lsbCBvbmx5IGJlIHVzZWQgaWYgdGhlIG9wdGlvbiBpcyBub3QgZGVmaW5lZCwgb3ZlcnJpZGVzIHRoZSBnbG9iYWwgc3RyaWN0RGVmYXVsdCBmbGFnXG4gICAgICogICAgIHR5cGU6ICd0eXBlX3N0cmluZycgICAvLyBvcHRpb25hbCB0eXBlIHJlcXVpcmVtZW50IGZvciB0aGUgb3B0aW9uXG4gICAgICogICAgICAgICB0eXBlX3N0cmluZyBjYW4gYmUgYSBKYXZhc2NyaXB0IHR5cGUgbmFtZTogICdzdHJpbmcnLCAnbnVtYmVyJywgJ29iamVjdCcsICdib29sZWFuJywgJ2Z1bmN0aW9uJ1xuICAgICAqICAgICAgICAgaXQgY2FuIGFsc28gYmUgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG4gICAgICogICAgICAgICAgICAgJ05vbkVtcHR5U3RyaW5nJ1xuICAgICAqICAgICAgICAgICAgICdOdW1iZXJHcmVhdGVyVGhhblplcm8nXG4gICAgICogICAgICAgICAgICAgJ05vblplcm9OdW1iZXInXG4gICAgICogICAgICAgICAgICAgJ0FycmF5JyB8ICdhcnJheSdcbiAgICAgKiAgICAgICAgICAgICAnY3VzdG9tJyAgIC8vIG5vIGNoZWNrcyBkb25lLCBtZWFudCB0byBiZSB1c2VkIHdpdGggYSBjdXN0b21DaGVjayBmdW5jdGlvblxuICAgICAqXG4gICAgICogICAgIC8vIEFkZGl0aW9uYWwgY2hlY2tzXG4gICAgICogICAgIGN1c3RvbUNoZWNrOiBmdW5jdGlvbiAgKHZhbHVlVG9DaGVjaykgPT4gIHsgLi4uIHJldHVybiB0cnVlfGZhbHNlIH0sIGEgZnVuY3Rpb24gdGhhdCBwZXJmb3JtcyBhbiBhZGRpdGlvbmFsIGNoZWNrIG9uIGEgdmFsdWVcbiAgICAgKiAgICAgY3VzdG9tQ2hlY2tEZXNjcmlwdGlvbjogJ3NvbWUgZGVzY3JpcHRpb24nLCBhIHN0cmluZyB1c2VkIHRvIHJlcG9ydCBmYWlsdXJlcyBmcm9tIHRoZSBjaGVja2VyIGZ1bmN0aW9uXG4gICAgICpcbiAgICAgKiAgICAgLy8gT2JqZWN0c1xuICAgICAqICAgICBvYmplY3RDbGFzczogU29tZUNsYXNzIC8vIGlmIHByZXNlbnQgYW5kIHR5cGU9PT0nb2JqZWN0JywgdGhlIGdpdmVuIHZhbHVlIGlzIGNoZWNrZWQgdG8gYmUgYSBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzXG4gICAgICogICAgIG9iamVjdERlZmluaXRpb246IDxvYmplY3Q+IC8vIGlmIHByZXNlbnQgYW5kIHR5cGU9PT0nb2JqZWN0JywgdGhlIHByb3BlcnR5IHdpbGwgYmUgY2hlY2tlZCBhZ2FpbnN0IHRoZSBnaXZlbiBkZWZpbml0aW9uXG4gICAgICpcbiAgICAgKiAgICAgLy8gQXJyYXlzXG4gICAgICogICAgIG1pbkxlbmd0aDogPG51bWJlcj5cbiAgICAgKiAgICAgbWF4TGVuZ3RoOiA8bnVtYmVyPlxuICAgICAqICAgICBlbGVtZW50RGVmaW5pdGlvbjogPG9iamVjdD4gLy8gaWYgcHJlc2VudCBhbmQgdHlwZSA9PT0gJ2FycmF5JywgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheSB3aWxsIGJlIGNoZWNrZWQgYWdhaW5zdCB0aGUgZ2l2ZW4gZGVmaW5pdGlvblxuICAgICAqXG4gICAgICogICAgIC8vIHN0cmluZ3NcbiAgICAgKiAgICAgbWluTGVuZ3RoOiA8bnVtYmVyPlxuICAgICAqICAgICBtYXhMZW5ndGg6IDxudW1iZXI+XG4gICAgICpcbiAgICAgKiAgICAgLy8gbnVtYmVyc1xuICAgICAqICAgICBtaW46IDxudW1iZXI+XG4gICAgICogICAgIG1heDogPG51bWJlcj5cbiAgICAgKlxuICAgICAqICAgIC8vIHZhbHVlIHRyYW5zZm9ybWF0aW9uIChlLmcuIG5vcm1hbGl6YXRpb24pXG4gICAgICogICAgdHJhbnNmb3JtRnVuY3Rpb246ICh2YWwpID0+IHsgcmV0dXJuIDx2YWx1ZSB0byBhc3NpZ24+fSAgIC8vIGFwcGxpZWQgYWZ0ZXIgYWxsIGNoZWNrcywgYnV0IG5vdCB0byBnaXZlbiBkZWZhdWx0c1xuICAgICAqICAgfVxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbnN0cnVjdG9yT3B0aW9uc1xuICAgICAqIEBwYXJhbSB7bnVsbHxzdHJpbmd9IGNvbnRleHRTdHIgIGlkIHN0cmluZyB0byB1c2UgaW4gZXhjZXB0aW9ucywgZXJyb3JzIGFuZCB3YXJuaW5nc1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdmVyYm9zZSAgaWYgdHJ1ZSwgZXJyb3JzIGFuZCB3YXJuaW5ncyB3aWxsIGJlIHJlcG9ydGVkIGluIHRoZSBjb25zb2xlXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uc3RydWN0b3JPcHRpb25zLCBjb250ZXh0U3RyPSBudWxsLCB2ZXJib3NlPWZhbHNlKSB7XG5cbiAgICAgICAgbGV0IGNvbnN0cnVjdG9yT3B0aW9uc09iamVjdCA9IGNvbnN0cnVjdG9yT3B0aW9uc1xuICAgICAgICBpZiAoY29udGV4dFN0ciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBJbml0aWFsaXppbmcgT3B0aW9uc0NoZWNrZXIgd2l0aCBtdWx0aXBsZSBhcmd1bWVudHMgd2lsbCBiZSBkZXByZWNhdGVkIGluIHRoZSBuZXh0IHZlcnNpb24uIENvbnRleHQ6ICR7Y29udGV4dFN0cn1gKVxuICAgICAgICAgICAgLy8gdGhpcyBtZWFucyB0aGUgb2xkIHN0eWxlIGNhbGxcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yT3B0aW9uc09iamVjdCA9IHtcbiAgICAgICAgICAgICAgICBvcHRpb25zRGVmaW5pdGlvbjogY29uc3RydWN0b3JPcHRpb25zLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHRTdHIsXG4gICAgICAgICAgICAgICAgdmVyYm9zZTogdmVyYm9zZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNoZWNrZXJPcHRpb25zRGVmaW5pdGlvbiA9IHtcbiAgICAgICAgICAgIG9wdGlvbnNEZWZpbml0aW9uOiB7IHR5cGU6ICdvYmplY3QnLCByZXF1aXJlZDogdHJ1ZX0sXG4gICAgICAgICAgICBjb250ZXh0OiB7IHR5cGU6ICdOb25FbXB0eVN0cmluZycsIHJlcXVpcmVkOiB0cnVlfSxcbiAgICAgICAgICAgIHN0cmljdERlZmF1bHQ6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiBmYWxzZX0sXG4gICAgICAgICAgICB2ZXJib3NlOiB7IHR5cGU6ICdib29sZWFuJywgZGVmYXVsdDogZmFsc2V9LFxuICAgICAgICAgICAgZGVidWc6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiBmYWxzZX1cbiAgICAgICAgfVxuICAgICAgICBsZXQgIGNsZWFuT3B0aW9ucyA9IF9nZXRDbGVhbk9wdGlvbnMoY29uc3RydWN0b3JPcHRpb25zT2JqZWN0LCBjaGVja2VyT3B0aW9uc0RlZmluaXRpb24sIGAke2NvbnRleHRTdHIgPT09IG51bGwgPyAnT3B0aW9uc0NoZWNrZXInIDogY29udGV4dFN0cn0gY29uc3RydWN0b3JgLCBmYWxzZSwgZmFsc2UsIHRydWUpXG5cbiAgICAgICAgdGhpcy5vcHRpb25zRGVmaW5pdGlvbiA9IGNsZWFuT3B0aW9ucy5vcHRpb25zRGVmaW5pdGlvblxuICAgICAgICB0aGlzLmNvbnRleHRTdHIgPSBjbGVhbk9wdGlvbnMuY29udGV4dFxuICAgICAgICB0aGlzLnZlcmJvc2UgPSBjbGVhbk9wdGlvbnMudmVyYm9zZVxuICAgICAgICB0aGlzLnN0cmljdERlZmF1bHQgPSBjbGVhbk9wdGlvbnMuc3RyaWN0RGVmYXVsdFxuICAgICAgICB0aGlzLnNldERlYnVnKGNsZWFuT3B0aW9ucy5kZWJ1ZylcbiAgICB9XG5cbiAgICBzZXREZWJ1ZyhkZWJ1Zykge1xuICAgICAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgICAgIHRoaXMuZGVidWcgPSB0cnVlXG4gICAgICAgICAgICB0aGlzLnZlcmJvc2UgPSB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmRlYnVnID0gZmFsc2VcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNPYmplY3RcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAgICpcbiAgICAgKi9cbiAgICBnZXRDbGVhbk9wdGlvbnMob3B0aW9uc09iamVjdCkge1xuICAgICAgIHJldHVybiBfZ2V0Q2xlYW5PcHRpb25zKG9wdGlvbnNPYmplY3QsIHRoaXMub3B0aW9uc0RlZmluaXRpb24sIHRoaXMuY29udGV4dFN0ciwgdGhpcy52ZXJib3NlLCB0aGlzLmRlYnVnLCB0aGlzLnN0cmljdERlZmF1bHQpXG4gICAgfVxuXG4gICAgZ2V0RGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldENsZWFuT3B0aW9ucyh7fSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIF9ub3JtYWxpemVUeXBlU3RyaW5nKHR5cGVTdHIpIHtcbiAgICBsZXQgdHlwZSA9IHR5cGVTdHIudG9Mb3dlckNhc2UoKVxuXG4gICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnYm9vbCc6XG4gICAgICAgICAgICByZXR1cm4gJ2Jvb2xlYW4nXG5cbiAgICAgICAgY2FzZSAnZnVuYyc6XG4gICAgICAgICAgICByZXR1cm4gJ2Z1bmN0aW9uJ1xuXG4gICAgICAgIGNhc2UgJ25vbmVtcHR5c3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiAnTm9uRW1wdHlTdHJpbmcnXG5cbiAgICAgICAgY2FzZSAnbnVtYmVyZ3JlYXRlcnRoYW56ZXJvJzpcbiAgICAgICAgICAgIHJldHVybiAnTnVtYmVyR3JlYXRlclRoYW5aZXJvJ1xuXG4gICAgICAgIGNhc2UgJ25vbnplcm9udW1iZXInOlxuICAgICAgICAgICAgcmV0dXJuICdOb25aZXJvTnVtYmVyJ1xuXG4gICAgfVxuICAgIHJldHVybiB0eXBlXG59XG5mdW5jdGlvbiBzUHJldHR5UHJpbnQodmFsdWUpIHtcbiAgICBzd2l0Y2ggKHR5cGVvZiAodmFsdWUpKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gYCcke3ZhbHVlfSdgXG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYFtBcnJheV1gXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWUuY29uc3RydWN0b3IubmFtZSAhPT0gJ09iamVjdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYFske3ZhbHVlLmNvbnN0cnVjdG9yLm5hbWV9XWBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnW09iamVjdF0nXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gYCR7dmFsdWV9YFxuICAgIH1cbn1cblxuZnVuY3Rpb24gX2dldENsZWFuT3B0aW9ucyhvcHRpb25zT2JqZWN0LCBvcHRpb25zRGVmaW5pdGlvbiwgY29udGV4dFN0ciwgdmVyYm9zZSwgZGVidWcsIHN0cmljdERlZmF1bHQpIHtcbiAgICBkZWJ1ZyAmJiBjb25zb2xlLmxvZyhgR2V0dGluZyBjbGVhbiBvcHRpb25zIGZvciBjb250ZXh0ICcke2NvbnRleHRTdHJ9J2ApXG4gICAgbGV0IGNsZWFuT3B0aW9ucyA9IHt9XG4gICAgZm9yIChjb25zdCBvcHRpb25OYW1lIGluIG9wdGlvbnNEZWZpbml0aW9uKSB7XG4gICAgICAgIGlmICghb3B0aW9uc0RlZmluaXRpb24uaGFzT3duUHJvcGVydHkob3B0aW9uTmFtZSkpIHtcbiAgICAgICAgICAgIGRlYnVnICYmIGNvbnNvbGUubG9nKGBJZ25vcmluZyBwcm9wZXJ0eSAke29wdGlvbk5hbWV9LCB3aGljaCBpcyBub3QgYW4gb3duIHByb3BlcnR5IG9mIHRoZSBvcHRpb25zRGVmaW5pdGlvbiBvYmplY3RgKVxuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBsZXQgb3B0aW9uRGVmaW5pdGlvbiA9IG9wdGlvbnNEZWZpbml0aW9uW29wdGlvbk5hbWVdXG4gICAgICAgIGRlYnVnICYmIGNvbnNvbGUubG9nKGBDaGVja2luZyBvcHRpb24gJyR7b3B0aW9uTmFtZX0nYClcbiAgICAgICAgZGVidWcgJiYgY29uc29sZS5sb2coYERlZmluaXRpb246YClcbiAgICAgICAgZGVidWcgJiYgY29uc29sZS5sb2cob3B0aW9uRGVmaW5pdGlvbilcbiAgICAgICAgZGVidWcgJiYgY29uc29sZS5sb2coYFZhbHVlIHRvIGNoZWNrOmApXG4gICAgICAgIGRlYnVnICYmIGNvbnNvbGUubG9nKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0pXG4gICAgICAgIGlmIChvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIG9wdGlvbk5hbWUgaXMgTk9UIGluIG9wdGlvbnNPYmplY3RcbiAgICAgICAgICAgIGlmIChvcHRpb25EZWZpbml0aW9uLnJlcXVpcmVkKSB7XG4gICAgICAgICAgICAgICAgX3Rocm93RXJyb3IoYFJlcXVpcmVkIG9wdGlvbiAnJHtvcHRpb25OYW1lfScgbm90IGZvdW5kYCwgY29udGV4dFN0ciwgdmVyYm9zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25EZWZpbml0aW9uLmRlZmF1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIF90aHJvd0Vycm9yKGBObyBkZWZhdWx0IGRlZmluZWQgZm9yIG9wdGlvbiAnJHtvcHRpb25OYW1lfSdgLCBjb250ZXh0U3RyLCB2ZXJib3NlKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVidWcgJiYgY29uc29sZS5sb2coYEFzc2lnbmluZyBkZWZhdWx0YClcbiAgICAgICAgICAgIGNsZWFuT3B0aW9uc1tvcHRpb25OYW1lXSA9IG9wdGlvbkRlZmluaXRpb24uZGVmYXVsdFxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb3B0aW9uTmFtZSBpcyBwcmVzZW50IGluIG9wdGlvbnNPYmplY3RcbiAgICAgICAgLy8gY2hlY2sgdHlwZVxuICAgICAgICBpZiAob3B0aW9uRGVmaW5pdGlvbi50eXBlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIG5vIHR5cGUgZ2l2ZW4sIG5vdGhpbmcgZWxzZSB0byBkb1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbkRlZmluaXRpb24udHlwZSAhPT0gJ3N0cmluZycgfHwgb3B0aW9uRGVmaW5pdGlvbi50eXBlID09PSAnJykge1xuICAgICAgICAgICAgLy8gYmFkIHR5cGUgZ2l2ZW5cbiAgICAgICAgICAgIF90aHJvd0Vycm9yKGBJbnZhbGlkIHR5cGUgaW4gZGVmaW5pdGlvbiBmb3IgJHtvcHRpb25OYW1lfSwgbmVlZCBhIG5vbi1lbXB0eSBzdHJpbmcsICR7c1ByZXR0eVByaW50KG9wdGlvbkRlZmluaXRpb24udHlwZSl9IGdpdmVuYCxcbiAgICAgICAgICAgICAgICBjb250ZXh0U3RyLCB2ZXJib3NlKVxuICAgICAgICB9XG4gICAgICAgIC8vIHByZS1wcm9jZXNzIHR5cGVcbiAgICAgICAgbGV0IGRlZmluaXRpb25UeXBlID0gX25vcm1hbGl6ZVR5cGVTdHJpbmcob3B0aW9uRGVmaW5pdGlvbi50eXBlKVxuICAgICAgICBzd2l0Y2goZGVmaW5pdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ05vbkVtcHR5U3RyaW5nJzpcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uVHlwZSA9ICdzdHJpbmcnXG4gICAgICAgICAgICAgICAgb3B0aW9uRGVmaW5pdGlvbi50eXBlID0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICBvcHRpb25EZWZpbml0aW9uLm1pbkxlbmd0aCA9IDFcbiAgICAgICAgICAgICAgICBvcHRpb25EZWZpbml0aW9uLm1heExlbmd0aCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgZGVidWcgJiYgY29uc29sZS5sb2coYE5vcm1hbGl6ZWQgZGVmaW5pdGlvbiB0eXBlOiAnJHtkZWZpbml0aW9uVHlwZX0nYClcblxuICAgICAgICBsZXQgY2hlY2tGYWlsID0gZmFsc2VcbiAgICAgICAgbGV0IGNoZWNrRmFpbE1lc3NhZ2UgPSAnJ1xuICAgICAgICBsZXQgY2xlYW5WYWx1ZUFzc2lnbmVkID0gZmFsc2VcblxuICAgICAgICBzd2l0Y2goZGVmaW5pdGlvblR5cGUpICB7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0gIT09IGRlZmluaXRpb25UeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbCA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsTWVzc2FnZSA9IGAke29wdGlvbk5hbWV9IHNob3VsZCBiZSBhICR7b3B0aW9uRGVmaW5pdGlvbi50eXBlfSwgJHtzUHJldHR5UHJpbnQodHlwZW9mIG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0pfSBnaXZlbmBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0pID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9uRGVmaW5pdGlvblsnbWluJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0gPCBvcHRpb25EZWZpbml0aW9uWydtaW4nXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbCA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWxNZXNzYWdlID0gYE51bWJlciAnJHtvcHRpb25OYW1lfScgc2hvdWxkIGJlIGVxdWFsIHRvIG9yIGdyZWF0ZXIgdGhhbiAke29wdGlvbkRlZmluaXRpb25bJ21pbiddfSwgJHtvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdfSBnaXZlbmBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9uRGVmaW5pdGlvblsnbWF4J10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0gPiBvcHRpb25EZWZpbml0aW9uWydtYXgnXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbCA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWxNZXNzYWdlID0gYE51bWJlciAnJHtvcHRpb25OYW1lfScgc2hvdWxkIGJlIGVxdWFsIHRvIG9yIGxlc3NlciB0aGFuICR7b3B0aW9uRGVmaW5pdGlvblsnbWF4J119LCAke29wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV19IGdpdmVuYFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWxNZXNzYWdlID0gYCR7b3B0aW9uTmFtZX0gc2hvdWxkIGJlIGEgbnVtYmVyLCAke3NQcmV0dHlQcmludCh0eXBlb2Ygb3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSl9IGdpdmVuYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVha1xuXG4gICAgICAgICAgICBjYXNlICdOb25FbXB0eVN0cmluZyc6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdICE9PSAnc3RyaW5nJyB8fCBvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWwgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbE1lc3NhZ2UgPSBgJHtvcHRpb25OYW1lfSBzaG91bGQgYmUgYSBub24tZW1wdHkgc3RyaW5nLCAke3NQcmV0dHlQcmludChvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdKX0gZ2l2ZW5gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrXG5cblxuICAgICAgICAgICAgY2FzZSAnTnVtYmVyR3JlYXRlclRoYW5aZXJvJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0gIT09ICdudW1iZXInIHx8IG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0gPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWwgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbE1lc3NhZ2UgPSBgJHtvcHRpb25OYW1lfSBzaG91bGQgYmUgYSBudW1iZXIgZ3JlYXRlciB0aGFuIHplcm8sICR7c1ByZXR0eVByaW50KG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0pfSBnaXZlbmBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgICAgY2FzZSAnTm9uWmVyb051bWJlcic6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdICE9PSAnbnVtYmVyJyB8fCBvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbCA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsTWVzc2FnZSA9IGAke29wdGlvbk5hbWV9IHNob3VsZCBiZSBhIG51bWJlciBub3QgZXF1YWwgdG8gemVybywgJHtzUHJldHR5UHJpbnQob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSl9IGdpdmVuYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVha1xuXG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWxNZXNzYWdlID0gYCR7b3B0aW9uTmFtZX0gc2hvdWxkIGJlIGEgc3RyaW5nLCAke3NQcmV0dHlQcmludCh0eXBlb2Ygb3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSl9IGdpdmVuYFxuICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uRGVmaW5pdGlvblsnbWluTGVuZ3RoJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXS5sZW5ndGggPCBvcHRpb25EZWZpbml0aW9uWydtaW5MZW5ndGgnXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsTWVzc2FnZSA9IGBTdHJpbmcgJyR7b3B0aW9uTmFtZX0nIHNob3VsZCBiZSBhdCBsZWFzdCAke29wdGlvbkRlZmluaXRpb25bJ21pbkxlbmd0aCddfSBjaGFyYWN0ZXJzKHMpIGxvbmcsIGl0IGhhcyAke29wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0ubGVuZ3RofWBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uRGVmaW5pdGlvblsnbWF4TGVuZ3RoJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXS5sZW5ndGggPiBvcHRpb25EZWZpbml0aW9uWydtYXhMZW5ndGgnXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsTWVzc2FnZSA9IGBTdHJpbmcgJyR7b3B0aW9uTmFtZX0nIHNob3VsZCBub3QgaGF2ZSBtb3JlIHRoYW4gJHtvcHRpb25EZWZpbml0aW9uWydtYXhMZW5ndGgnXX0gY2hhcmFjdGVyKHMpLCBpdCBoYXMgJHtvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdLmxlbmd0aH1gXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbCA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsTWVzc2FnZSA9IGAke29wdGlvbk5hbWV9IG11c3QgYmUgYW4gb2JqZWN0LCAke3NQcmV0dHlQcmludCh0eXBlb2Ygb3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSl9IGdpdmVuYFxuICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBpZiB3ZSBoYXZlIGFuIG9iamVjdENsYXNzLCBjaGVjayBmb3IgaXRcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uRGVmaW5pdGlvblsnb2JqZWN0Q2xhc3MnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0gaW5zdGFuY2VvZiBvcHRpb25EZWZpbml0aW9uWydvYmplY3RDbGFzcyddKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsTWVzc2FnZSA9IGAke29wdGlvbk5hbWV9IG11c3QgYmUgYW4gb2JqZWN0IG9mIGNsYXNzICR7b3B0aW9uRGVmaW5pdGlvblsnb2JqZWN0Q2xhc3MnXS5uYW1lfSxgICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgICR7b3B0aW9uc09iamVjdFtvcHRpb25OYW1lXS5jb25zdHJ1Y3Rvci5uYW1lfSBnaXZlbiwgd2lsbCBhc3NpZ24gZGVmYXVsdGBcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUncyBhbiBvYmplY3QgZGVmaW5pdGlvbiwgY2hlY2sgaXRcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uRGVmaW5pdGlvblsnb2JqZWN0RGVmaW5pdGlvbiddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld09jID0gbmV3IE9wdGlvbnNDaGVja2VyKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnNEZWZpbml0aW9uOiBvcHRpb25EZWZpbml0aW9uWydvYmplY3REZWZpbml0aW9uJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiAgYCR7Y29udGV4dFN0cn0gOiAke29wdGlvbk5hbWV9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJvc2U6IHZlcmJvc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1ZzogZGVidWdcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNsZWFuT2JqZWN0ID0ge31cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFuT2JqZWN0ID0gbmV3T2MuZ2V0Q2xlYW5PcHRpb25zKG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0pXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbCA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbE1lc3NhZ2UgPSBlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgd2UgZ2V0IGhlcmUgbmV3T2MuZ2V0Q2xlYW5PcHRpb25zIHJhbiBmaW5lXG4gICAgICAgICAgICAgICAgICAgIGlmICghY2hlY2tGYWlsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhbk9wdGlvbnNbb3B0aW9uTmFtZV0gPSBjbGVhbk9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYW5WYWx1ZUFzc2lnbmVkID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tGYWlsID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWxNZXNzYWdlID0gYCR7b3B0aW9uTmFtZX0gbXVzdCBiZSBhbiBhcnJheSwgJHtzUHJldHR5UHJpbnQodHlwZW9mIG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0pfSBnaXZlbmBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbkRlZmluaXRpb25bJ21pbkxlbmd0aCddICE9PSB1bmRlZmluZWQgJiYgb3B0aW9uc09iamVjdFtvcHRpb25OYW1lXS5sZW5ndGggPCBvcHRpb25EZWZpbml0aW9uWydtaW5MZW5ndGgnXSkge1xuICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWwgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbE1lc3NhZ2UgPSBgQXJyYXkgJyR7b3B0aW9uTmFtZX0nIHNob3VsZCBoYXZlIGF0IGxlYXN0ICR7b3B0aW9uRGVmaW5pdGlvblsnbWluTGVuZ3RoJ119IGVsZW1lbnQocyksIGl0IGhhcyAke29wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0ubGVuZ3RofWBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbkRlZmluaXRpb25bJ21heExlbmd0aCddICE9PSB1bmRlZmluZWQgJiYgb3B0aW9uc09iamVjdFtvcHRpb25OYW1lXS5sZW5ndGggPiBvcHRpb25EZWZpbml0aW9uWydtYXhMZW5ndGgnXSkge1xuICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWwgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrRmFpbE1lc3NhZ2UgPWBBcnJheSAnJHtvcHRpb25OYW1lfScgc2hvdWxkIG5vdCBoYXZlIG1vcmUgdGhhbiAke29wdGlvbkRlZmluaXRpb25bJ21heExlbmd0aCddfSBlbGVtZW50KHMpLCBpdCBoYXMgJHtvcHRpb25zT2JqZWN0W29wdGlvbk5hbWVdLmxlbmd0aH1gXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbkRlZmluaXRpb25bJ2VsZW1lbnREZWZpbml0aW9uJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhcHBseSB0aGUgZGVmaW5pdGlvbiB0byBldmVyeSBlbGVtZW50IGluIHRoZSBhcnJheVxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYW5PcHRpb25zW29wdGlvbk5hbWVdID0gb3B0aW9uc09iamVjdFtvcHRpb25OYW1lXS5tYXAoKGVsZSwgaSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld09jID0gbmV3IE9wdGlvbnNDaGVja2VyKCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnNEZWZpbml0aW9uOiB7IGVsZW1lbnQ6IG9wdGlvbkRlZmluaXRpb25bJ2VsZW1lbnREZWZpbml0aW9uJ10gfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dDogYCR7Y29udGV4dFN0cn0gOiAke29wdGlvbk5hbWV9IDogZWxlbWVudCAke2l9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYm9zZTogdmVyYm9zZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWc6IGRlYnVnIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ld09jLmdldENsZWFuT3B0aW9ucyggeyBlbGVtZW50OiBlbGV9KVsnZWxlbWVudCddXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWwgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja0ZhaWxNZXNzYWdlID0gZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghY2hlY2tGYWlsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhblZhbHVlQXNzaWduZWQgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzpcbiAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nLCB3aWxsIHBlcmZvcm0gY3VzdG9tIGNoZWNrZXIgZnVuY3Rpb24gbGF0ZXJcbiAgICAgICAgICAgICAgICBicmVha1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIF90aHJvd0Vycm9yKGBVbnJlY29nbml6ZWQgdHlwZSAnJHtvcHRpb25EZWZpbml0aW9uLnR5cGV9JyBpbiB0aGUgZGVmaW5pdGlvbiBvZiAnJHtvcHRpb25OYW1lfSdgLCBjb250ZXh0U3RyLCB2ZXJib3NlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGVyZm9ybSBleHRyYSBjaGVjayBpZiBubyBlcnJvcnMgZm91bmRcbiAgICAgICAgaWYgKCFjaGVja0ZhaWwgJiYgb3B0aW9uRGVmaW5pdGlvbi5jdXN0b21DaGVjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbkRlZmluaXRpb24uY3VzdG9tQ2hlY2sob3B0aW9uc09iamVjdFtvcHRpb25OYW1lXSkpIHtcbiAgICAgICAgICAgICAgICAvLyBjdXN0b20gY2hlY2sgZmFpbHNcbiAgICAgICAgICAgICAgICBjaGVja0ZhaWwgPSB0cnVlXG4gICAgICAgICAgICAgICAgY2hlY2tGYWlsTWVzc2FnZSA9IGAke29wdGlvbk5hbWV9IG11c3QgYmUgJHtvcHRpb25EZWZpbml0aW9uLmN1c3RvbUNoZWNrRGVzY3JpcHRpb259LCBgICtcbiAgICAgICAgICAgICAgICAgICAgYCR7c1ByZXR0eVByaW50KG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV0pfSBnaXZlbmBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGVja0ZhaWwpIHtcbiAgICAgICAgICAgIGxldCBvcHRpb25TdHJpY3REZWZhdWx0ID0gb3B0aW9uRGVmaW5pdGlvbi5zdHJpY3REZWZhdWx0ICE9PSB1bmRlZmluZWQgPyBvcHRpb25EZWZpbml0aW9uLnN0cmljdERlZmF1bHQgOiBzdHJpY3REZWZhdWx0XG5cbiAgICAgICAgICAgIGlmIChvcHRpb25TdHJpY3REZWZhdWx0IHx8IG9wdGlvbkRlZmluaXRpb24uZGVmYXVsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgX3Rocm93RXJyb3IoY2hlY2tGYWlsTWVzc2FnZSwgY29udGV4dFN0ciwgdmVyYm9zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZlcmJvc2UgJiYgY29uc29sZS53YXJuKGAke2NoZWNrRmFpbE1lc3NhZ2V9LiBEZWZhdWx0IGFzc2lnbmVkLmApXG4gICAgICAgICAgICAgICAgY2xlYW5PcHRpb25zW29wdGlvbk5hbWVdID0gb3B0aW9uRGVmaW5pdGlvbi5kZWZhdWx0XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIWNsZWFuVmFsdWVBc3NpZ25lZCkge1xuICAgICAgICAgICAgICAgIGNsZWFuT3B0aW9uc1tvcHRpb25OYW1lXSA9IG9wdGlvbnNPYmplY3Rbb3B0aW9uTmFtZV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGFwcGx5IHRyYW5zZm9ybSBmdW5jdGlvbiwgaWYgdGhlcmUncyBhbnlcbiAgICAgICAgICAgIGlmIChvcHRpb25EZWZpbml0aW9uWyd0cmFuc2Zvcm1GdW5jdGlvbiddICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mKG9wdGlvbkRlZmluaXRpb25bJ3RyYW5zZm9ybUZ1bmN0aW9uJ10pID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVidWcgJiYgY29uc29sZS5sb2coYEFwcGx5aW5nIHRyYW5zZm9ybSBmdW5jdGlvbmApXG4gICAgICAgICAgICAgICAgY2xlYW5PcHRpb25zW29wdGlvbk5hbWVdID0gb3B0aW9uRGVmaW5pdGlvblsndHJhbnNmb3JtRnVuY3Rpb24nXShjbGVhbk9wdGlvbnNbb3B0aW9uTmFtZV0pXG4gICAgICAgICAgICAgICAgaWYgKGNsZWFuT3B0aW9uc1tvcHRpb25OYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIF90aHJvd0Vycm9yKGBUcmFuc2Zvcm0gZnVuY3Rpb24gcmV0dXJuZWQgdW5kZWZpbmVkIHZhbHVlIGZvciBvcHRpb24gJHtvcHRpb25OYW1lfWAsIGNvbnRleHRTdHIsIHZlcmJvc2UpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9XG4gICAgcmV0dXJuIGNsZWFuT3B0aW9ucztcbn1cblxuXG5mdW5jdGlvbiBfdGhyb3dFcnJvcihtZXNzYWdlLCBjb250ZXh0LCB2ZXJib3NlKSB7XG4gICAgbGV0IGVycm9yTWVzc2FnZSA9IGAke2NvbnRleHR9IDogJHttZXNzYWdlfWBcbiAgICB2ZXJib3NlICYmIGNvbnNvbGUuZXJyb3IoZXJyb3JNZXNzYWdlKVxuICAgIHRocm93IG5ldyBFcnJvcihlcnJvck1lc3NhZ2UpXG59IiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9jc3NXaXRoTWFwcGluZ1RvU3RyaW5nLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgXCJcXG4udGVzdC1jbGFzcyB7XFxuICAgIGNvbG9yOiBmdWNoc2lhO1xcbn1cXG5cXG50YWJsZS5udW1iZXItdGFibGUge1xcbiAgICBtYXJnaW46IDFyZW07XFxufVxcbnRhYmxlLm51bWJlci10YWJsZSB0ZCB7XFxuICAgIHRleHQtYWxpZ246IHJpZ2h0O1xcbiAgICBwYWRkaW5nOiA1cHg7XFxuICAgIGJvcmRlcjogMXB4IHNvbGlkICNmOGVhZWE7XFxufVxcbi5yYW5rLTAge1xcbiAgICBjb2xvcjogc2lsdmVyO1xcbn1cXG5cXG4ucmFuay0xIHtcXG4gICAgY29sb3I6IGdyYXk7XFxufVxcblxcbi5yYW5rLTMge1xcbiAgICBjb2xvcjogZGFya2N5YW47XFxufVxcblxcbi5yYW5rLTQge1xcbiAgICBjb2xvcjogZGFya29saXZlZ3JlZW47XFxufVxcblxcbi5yYW5rLTUge1xcbiAgICBjb2xvcjogZ3JlZW47XFxufVxcblxcbi5yYW5rLTYge1xcbiAgICBjb2xvcjogZGFya21hZ2VudGE7XFxufVxcblxcbi5yYW5rLTgge1xcbiAgICBjb2xvcjogZGFya3JlZDtcXG59XFxuXFxuLnJhbmstOSB7XFxuICAgIGNvbG9yOiByZWQ7XFxufVxcblxcbi5vZGQtcm93IHtcXG4gICAgYmFja2dyb3VuZC1jb2xvcjogaXZvcnk7XFxufVwiLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uLy4uL3Rlc3QvanMvZnVuY3Rpb25hbC90ZXN0LWFycmF5LXRvLXRhYmxlLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiO0FBQ0E7SUFDSSxjQUFjO0FBQ2xCOztBQUVBO0lBQ0ksWUFBWTtBQUNoQjtBQUNBO0lBQ0ksaUJBQWlCO0lBQ2pCLFlBQVk7SUFDWix5QkFBeUI7QUFDN0I7QUFDQTtJQUNJLGFBQWE7QUFDakI7O0FBRUE7SUFDSSxXQUFXO0FBQ2Y7O0FBRUE7SUFDSSxlQUFlO0FBQ25COztBQUVBO0lBQ0kscUJBQXFCO0FBQ3pCOztBQUVBO0lBQ0ksWUFBWTtBQUNoQjs7QUFFQTtJQUNJLGtCQUFrQjtBQUN0Qjs7QUFFQTtJQUNJLGNBQWM7QUFDbEI7O0FBRUE7SUFDSSxVQUFVO0FBQ2Q7O0FBRUE7SUFDSSx1QkFBdUI7QUFDM0JcIixcInNvdXJjZXNDb250ZW50XCI6W1wiXFxuLnRlc3QtY2xhc3Mge1xcbiAgICBjb2xvcjogZnVjaHNpYTtcXG59XFxuXFxudGFibGUubnVtYmVyLXRhYmxlIHtcXG4gICAgbWFyZ2luOiAxcmVtO1xcbn1cXG50YWJsZS5udW1iZXItdGFibGUgdGQge1xcbiAgICB0ZXh0LWFsaWduOiByaWdodDtcXG4gICAgcGFkZGluZzogNXB4O1xcbiAgICBib3JkZXI6IDFweCBzb2xpZCAjZjhlYWVhO1xcbn1cXG4ucmFuay0wIHtcXG4gICAgY29sb3I6IHNpbHZlcjtcXG59XFxuXFxuLnJhbmstMSB7XFxuICAgIGNvbG9yOiBncmF5O1xcbn1cXG5cXG4ucmFuay0zIHtcXG4gICAgY29sb3I6IGRhcmtjeWFuO1xcbn1cXG5cXG4ucmFuay00IHtcXG4gICAgY29sb3I6IGRhcmtvbGl2ZWdyZWVuO1xcbn1cXG5cXG4ucmFuay01IHtcXG4gICAgY29sb3I6IGdyZWVuO1xcbn1cXG5cXG4ucmFuay02IHtcXG4gICAgY29sb3I6IGRhcmttYWdlbnRhO1xcbn1cXG5cXG4ucmFuay04IHtcXG4gICAgY29sb3I6IGRhcmtyZWQ7XFxufVxcblxcbi5yYW5rLTkge1xcbiAgICBjb2xvcjogcmVkO1xcbn1cXG5cXG4ub2RkLXJvdyB7XFxuICAgIGJhY2tncm91bmQtY29sb3I6IGl2b3J5O1xcbn1cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gIE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gIEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG4vLyBjc3MgYmFzZSBjb2RlLCBpbmplY3RlZCBieSB0aGUgY3NzLWxvYWRlclxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGZ1bmMtbmFtZXNcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcpIHtcbiAgdmFyIGxpc3QgPSBbXTsgLy8gcmV0dXJuIHRoZSBsaXN0IG9mIG1vZHVsZXMgYXMgY3NzIHN0cmluZ1xuXG4gIGxpc3QudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHZhciBjb250ZW50ID0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtKTtcblxuICAgICAgaWYgKGl0ZW1bMl0pIHtcbiAgICAgICAgcmV0dXJuIFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpLmNvbmNhdChjb250ZW50LCBcIn1cIik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH0pLmpvaW4oXCJcIik7XG4gIH07IC8vIGltcG9ydCBhIGxpc3Qgb2YgbW9kdWxlcyBpbnRvIHRoZSBsaXN0XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBmdW5jLW5hbWVzXG5cblxuICBsaXN0LmkgPSBmdW5jdGlvbiAobW9kdWxlcywgbWVkaWFRdWVyeSwgZGVkdXBlKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGVzID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cbiAgICAgIG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIFwiXCJdXTtcbiAgICB9XG5cbiAgICB2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuXG4gICAgaWYgKGRlZHVwZSkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBwcmVmZXItZGVzdHJ1Y3R1cmluZ1xuICAgICAgICB2YXIgaWQgPSB0aGlzW2ldWzBdO1xuXG4gICAgICAgIGlmIChpZCAhPSBudWxsKSB7XG4gICAgICAgICAgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpZF0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IG1vZHVsZXMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICB2YXIgaXRlbSA9IFtdLmNvbmNhdChtb2R1bGVzW19pXSk7XG5cbiAgICAgIGlmIChkZWR1cGUgJiYgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpdGVtWzBdXSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29udGludWVcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChtZWRpYVF1ZXJ5KSB7XG4gICAgICAgIGlmICghaXRlbVsyXSkge1xuICAgICAgICAgIGl0ZW1bMl0gPSBtZWRpYVF1ZXJ5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMl0gPSBcIlwiLmNvbmNhdChtZWRpYVF1ZXJ5LCBcIiBhbmQgXCIpLmNvbmNhdChpdGVtWzJdKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsaXN0LnB1c2goaXRlbSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBsaXN0O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gX3NsaWNlZFRvQXJyYXkoYXJyLCBpKSB7IHJldHVybiBfYXJyYXlXaXRoSG9sZXMoYXJyKSB8fCBfaXRlcmFibGVUb0FycmF5TGltaXQoYXJyLCBpKSB8fCBfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkoYXJyLCBpKSB8fCBfbm9uSXRlcmFibGVSZXN0KCk7IH1cblxuZnVuY3Rpb24gX25vbkl0ZXJhYmxlUmVzdCgpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2UuXFxuSW4gb3JkZXIgdG8gYmUgaXRlcmFibGUsIG5vbi1hcnJheSBvYmplY3RzIG11c3QgaGF2ZSBhIFtTeW1ib2wuaXRlcmF0b3JdKCkgbWV0aG9kLlwiKTsgfVxuXG5mdW5jdGlvbiBfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkobywgbWluTGVuKSB7IGlmICghbykgcmV0dXJuOyBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHJldHVybiBfYXJyYXlMaWtlVG9BcnJheShvLCBtaW5MZW4pOyB2YXIgbiA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5zbGljZSg4LCAtMSk7IGlmIChuID09PSBcIk9iamVjdFwiICYmIG8uY29uc3RydWN0b3IpIG4gPSBvLmNvbnN0cnVjdG9yLm5hbWU7IGlmIChuID09PSBcIk1hcFwiIHx8IG4gPT09IFwiU2V0XCIpIHJldHVybiBBcnJheS5mcm9tKG8pOyBpZiAobiA9PT0gXCJBcmd1bWVudHNcIiB8fCAvXig/OlVpfEkpbnQoPzo4fDE2fDMyKSg/OkNsYW1wZWQpP0FycmF5JC8udGVzdChuKSkgcmV0dXJuIF9hcnJheUxpa2VUb0FycmF5KG8sIG1pbkxlbik7IH1cblxuZnVuY3Rpb24gX2FycmF5TGlrZVRvQXJyYXkoYXJyLCBsZW4pIHsgaWYgKGxlbiA9PSBudWxsIHx8IGxlbiA+IGFyci5sZW5ndGgpIGxlbiA9IGFyci5sZW5ndGg7IGZvciAodmFyIGkgPSAwLCBhcnIyID0gbmV3IEFycmF5KGxlbik7IGkgPCBsZW47IGkrKykgeyBhcnIyW2ldID0gYXJyW2ldOyB9IHJldHVybiBhcnIyOyB9XG5cbmZ1bmN0aW9uIF9pdGVyYWJsZVRvQXJyYXlMaW1pdChhcnIsIGkpIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwidW5kZWZpbmVkXCIgfHwgIShTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGFycikpKSByZXR1cm47IHZhciBfYXJyID0gW107IHZhciBfbiA9IHRydWU7IHZhciBfZCA9IGZhbHNlOyB2YXIgX2UgPSB1bmRlZmluZWQ7IHRyeSB7IGZvciAodmFyIF9pID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3M7ICEoX24gPSAoX3MgPSBfaS5uZXh0KCkpLmRvbmUpOyBfbiA9IHRydWUpIHsgX2Fyci5wdXNoKF9zLnZhbHVlKTsgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrOyB9IH0gY2F0Y2ggKGVycikgeyBfZCA9IHRydWU7IF9lID0gZXJyOyB9IGZpbmFsbHkgeyB0cnkgeyBpZiAoIV9uICYmIF9pW1wicmV0dXJuXCJdICE9IG51bGwpIF9pW1wicmV0dXJuXCJdKCk7IH0gZmluYWxseSB7IGlmIChfZCkgdGhyb3cgX2U7IH0gfSByZXR1cm4gX2FycjsgfVxuXG5mdW5jdGlvbiBfYXJyYXlXaXRoSG9sZXMoYXJyKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHJldHVybiBhcnI7IH1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKGl0ZW0pIHtcbiAgdmFyIF9pdGVtID0gX3NsaWNlZFRvQXJyYXkoaXRlbSwgNCksXG4gICAgICBjb250ZW50ID0gX2l0ZW1bMV0sXG4gICAgICBjc3NNYXBwaW5nID0gX2l0ZW1bM107XG5cbiAgaWYgKHR5cGVvZiBidG9hID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcbiAgICB2YXIgYmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoY3NzTWFwcGluZykpKSk7XG4gICAgdmFyIGRhdGEgPSBcInNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LFwiLmNvbmNhdChiYXNlNjQpO1xuICAgIHZhciBzb3VyY2VNYXBwaW5nID0gXCIvKiMgXCIuY29uY2F0KGRhdGEsIFwiICovXCIpO1xuICAgIHZhciBzb3VyY2VVUkxzID0gY3NzTWFwcGluZy5zb3VyY2VzLm1hcChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICByZXR1cm4gXCIvKiMgc291cmNlVVJMPVwiLmNvbmNhdChjc3NNYXBwaW5nLnNvdXJjZVJvb3QgfHwgXCJcIikuY29uY2F0KHNvdXJjZSwgXCIgKi9cIik7XG4gICAgfSk7XG4gICAgcmV0dXJuIFtjb250ZW50XS5jb25jYXQoc291cmNlVVJMcykuY29uY2F0KFtzb3VyY2VNYXBwaW5nXSkuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIHJldHVybiBbY29udGVudF0uam9pbihcIlxcblwiKTtcbn07IiwiaW1wb3J0IGFwaSBmcm9tIFwiIS4uLy4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgICAgICAgaW1wb3J0IGNvbnRlbnQgZnJvbSBcIiEhLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi90ZXN0LWFycmF5LXRvLXRhYmxlLmNzc1wiO1xuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLmluc2VydCA9IFwiaGVhZFwiO1xub3B0aW9ucy5zaW5nbGV0b24gPSBmYWxzZTtcblxudmFyIHVwZGF0ZSA9IGFwaShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCBkZWZhdWx0IGNvbnRlbnQubG9jYWxzIHx8IHt9OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgaXNPbGRJRSA9IGZ1bmN0aW9uIGlzT2xkSUUoKSB7XG4gIHZhciBtZW1vO1xuICByZXR1cm4gZnVuY3Rpb24gbWVtb3JpemUoKSB7XG4gICAgaWYgKHR5cGVvZiBtZW1vID09PSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gVGVzdCBmb3IgSUUgPD0gOSBhcyBwcm9wb3NlZCBieSBCcm93c2VyaGFja3NcbiAgICAgIC8vIEBzZWUgaHR0cDovL2Jyb3dzZXJoYWNrcy5jb20vI2hhY2stZTcxZDg2OTJmNjUzMzQxNzNmZWU3MTVjMjIyY2I4MDVcbiAgICAgIC8vIFRlc3RzIGZvciBleGlzdGVuY2Ugb2Ygc3RhbmRhcmQgZ2xvYmFscyBpcyB0byBhbGxvdyBzdHlsZS1sb2FkZXJcbiAgICAgIC8vIHRvIG9wZXJhdGUgY29ycmVjdGx5IGludG8gbm9uLXN0YW5kYXJkIGVudmlyb25tZW50c1xuICAgICAgLy8gQHNlZSBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay1jb250cmliL3N0eWxlLWxvYWRlci9pc3N1ZXMvMTc3XG4gICAgICBtZW1vID0gQm9vbGVhbih3aW5kb3cgJiYgZG9jdW1lbnQgJiYgZG9jdW1lbnQuYWxsICYmICF3aW5kb3cuYXRvYik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG59KCk7XG5cbnZhciBnZXRUYXJnZXQgPSBmdW5jdGlvbiBnZXRUYXJnZXQoKSB7XG4gIHZhciBtZW1vID0ge307XG4gIHJldHVybiBmdW5jdGlvbiBtZW1vcml6ZSh0YXJnZXQpIHtcbiAgICBpZiAodHlwZW9mIG1lbW9bdGFyZ2V0XSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHZhciBzdHlsZVRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0KTsgLy8gU3BlY2lhbCBjYXNlIHRvIHJldHVybiBoZWFkIG9mIGlmcmFtZSBpbnN0ZWFkIG9mIGlmcmFtZSBpdHNlbGZcblxuICAgICAgaWYgKHdpbmRvdy5IVE1MSUZyYW1lRWxlbWVudCAmJiBzdHlsZVRhcmdldCBpbnN0YW5jZW9mIHdpbmRvdy5IVE1MSUZyYW1lRWxlbWVudCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYWNjZXNzIHRvIGlmcmFtZSBpcyBibG9ja2VkXG4gICAgICAgICAgLy8gZHVlIHRvIGNyb3NzLW9yaWdpbiByZXN0cmljdGlvbnNcbiAgICAgICAgICBzdHlsZVRhcmdldCA9IHN0eWxlVGFyZ2V0LmNvbnRlbnREb2N1bWVudC5oZWFkO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gaXN0YW5idWwgaWdub3JlIG5leHRcbiAgICAgICAgICBzdHlsZVRhcmdldCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbWVtb1t0YXJnZXRdID0gc3R5bGVUYXJnZXQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1lbW9bdGFyZ2V0XTtcbiAgfTtcbn0oKTtcblxudmFyIHN0eWxlc0luRG9tID0gW107XG5cbmZ1bmN0aW9uIGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpIHtcbiAgdmFyIHJlc3VsdCA9IC0xO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3R5bGVzSW5Eb20ubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc3R5bGVzSW5Eb21baV0uaWRlbnRpZmllciA9PT0gaWRlbnRpZmllcikge1xuICAgICAgcmVzdWx0ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKSB7XG4gIHZhciBpZENvdW50TWFwID0ge307XG4gIHZhciBpZGVudGlmaWVycyA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXTtcbiAgICB2YXIgaWQgPSBvcHRpb25zLmJhc2UgPyBpdGVtWzBdICsgb3B0aW9ucy5iYXNlIDogaXRlbVswXTtcbiAgICB2YXIgY291bnQgPSBpZENvdW50TWFwW2lkXSB8fCAwO1xuICAgIHZhciBpZGVudGlmaWVyID0gXCJcIi5jb25jYXQoaWQsIFwiIFwiKS5jb25jYXQoY291bnQpO1xuICAgIGlkQ291bnRNYXBbaWRdID0gY291bnQgKyAxO1xuICAgIHZhciBpbmRleCA9IGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgIHZhciBvYmogPSB7XG4gICAgICBjc3M6IGl0ZW1bMV0sXG4gICAgICBtZWRpYTogaXRlbVsyXSxcbiAgICAgIHNvdXJjZU1hcDogaXRlbVszXVxuICAgIH07XG5cbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICBzdHlsZXNJbkRvbVtpbmRleF0ucmVmZXJlbmNlcysrO1xuICAgICAgc3R5bGVzSW5Eb21baW5kZXhdLnVwZGF0ZXIob2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3R5bGVzSW5Eb20ucHVzaCh7XG4gICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXG4gICAgICAgIHVwZGF0ZXI6IGFkZFN0eWxlKG9iaiwgb3B0aW9ucyksXG4gICAgICAgIHJlZmVyZW5jZXM6IDFcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlkZW50aWZpZXJzLnB1c2goaWRlbnRpZmllcik7XG4gIH1cblxuICByZXR1cm4gaWRlbnRpZmllcnM7XG59XG5cbmZ1bmN0aW9uIGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKSB7XG4gIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gIHZhciBhdHRyaWJ1dGVzID0gb3B0aW9ucy5hdHRyaWJ1dGVzIHx8IHt9O1xuXG4gIGlmICh0eXBlb2YgYXR0cmlidXRlcy5ub25jZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2YXIgbm9uY2UgPSB0eXBlb2YgX193ZWJwYWNrX25vbmNlX18gIT09ICd1bmRlZmluZWQnID8gX193ZWJwYWNrX25vbmNlX18gOiBudWxsO1xuXG4gICAgaWYgKG5vbmNlKSB7XG4gICAgICBhdHRyaWJ1dGVzLm5vbmNlID0gbm9uY2U7XG4gICAgfVxuICB9XG5cbiAgT2JqZWN0LmtleXMoYXR0cmlidXRlcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgc3R5bGUuc2V0QXR0cmlidXRlKGtleSwgYXR0cmlidXRlc1trZXldKTtcbiAgfSk7XG5cbiAgaWYgKHR5cGVvZiBvcHRpb25zLmluc2VydCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIG9wdGlvbnMuaW5zZXJ0KHN0eWxlKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgdGFyZ2V0ID0gZ2V0VGFyZ2V0KG9wdGlvbnMuaW5zZXJ0IHx8ICdoZWFkJyk7XG5cbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGRuJ3QgZmluZCBhIHN0eWxlIHRhcmdldC4gVGhpcyBwcm9iYWJseSBtZWFucyB0aGF0IHRoZSB2YWx1ZSBmb3IgdGhlICdpbnNlcnQnIHBhcmFtZXRlciBpcyBpbnZhbGlkLlwiKTtcbiAgICB9XG5cbiAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICB9XG5cbiAgcmV0dXJuIHN0eWxlO1xufVxuXG5mdW5jdGlvbiByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGUpIHtcbiAgLy8gaXN0YW5idWwgaWdub3JlIGlmXG4gIGlmIChzdHlsZS5wYXJlbnROb2RlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3R5bGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzdHlsZSk7XG59XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cblxuXG52YXIgcmVwbGFjZVRleHQgPSBmdW5jdGlvbiByZXBsYWNlVGV4dCgpIHtcbiAgdmFyIHRleHRTdG9yZSA9IFtdO1xuICByZXR1cm4gZnVuY3Rpb24gcmVwbGFjZShpbmRleCwgcmVwbGFjZW1lbnQpIHtcbiAgICB0ZXh0U3RvcmVbaW5kZXhdID0gcmVwbGFjZW1lbnQ7XG4gICAgcmV0dXJuIHRleHRTdG9yZS5maWx0ZXIoQm9vbGVhbikuam9pbignXFxuJyk7XG4gIH07XG59KCk7XG5cbmZ1bmN0aW9uIGFwcGx5VG9TaW5nbGV0b25UYWcoc3R5bGUsIGluZGV4LCByZW1vdmUsIG9iaikge1xuICB2YXIgY3NzID0gcmVtb3ZlID8gJycgOiBvYmoubWVkaWEgPyBcIkBtZWRpYSBcIi5jb25jYXQob2JqLm1lZGlhLCBcIiB7XCIpLmNvbmNhdChvYmouY3NzLCBcIn1cIikgOiBvYmouY3NzOyAvLyBGb3Igb2xkIElFXG5cbiAgLyogaXN0YW5idWwgaWdub3JlIGlmICAqL1xuXG4gIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gcmVwbGFjZVRleHQoaW5kZXgsIGNzcyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGNzc05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpO1xuICAgIHZhciBjaGlsZE5vZGVzID0gc3R5bGUuY2hpbGROb2RlcztcblxuICAgIGlmIChjaGlsZE5vZGVzW2luZGV4XSkge1xuICAgICAgc3R5bGUucmVtb3ZlQ2hpbGQoY2hpbGROb2Rlc1tpbmRleF0pO1xuICAgIH1cblxuICAgIGlmIChjaGlsZE5vZGVzLmxlbmd0aCkge1xuICAgICAgc3R5bGUuaW5zZXJ0QmVmb3JlKGNzc05vZGUsIGNoaWxkTm9kZXNbaW5kZXhdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoY3NzTm9kZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFwcGx5VG9UYWcoc3R5bGUsIG9wdGlvbnMsIG9iaikge1xuICB2YXIgY3NzID0gb2JqLmNzcztcbiAgdmFyIG1lZGlhID0gb2JqLm1lZGlhO1xuICB2YXIgc291cmNlTWFwID0gb2JqLnNvdXJjZU1hcDtcblxuICBpZiAobWVkaWEpIHtcbiAgICBzdHlsZS5zZXRBdHRyaWJ1dGUoJ21lZGlhJywgbWVkaWEpO1xuICB9IGVsc2Uge1xuICAgIHN0eWxlLnJlbW92ZUF0dHJpYnV0ZSgnbWVkaWEnKTtcbiAgfVxuXG4gIGlmIChzb3VyY2VNYXAgJiYgdHlwZW9mIGJ0b2EgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY3NzICs9IFwiXFxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxcIi5jb25jYXQoYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKSwgXCIgKi9cIik7XG4gIH0gLy8gRm9yIG9sZCBJRVxuXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAgKi9cblxuXG4gIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICB9IGVsc2Uge1xuICAgIHdoaWxlIChzdHlsZS5maXJzdENoaWxkKSB7XG4gICAgICBzdHlsZS5yZW1vdmVDaGlsZChzdHlsZS5maXJzdENoaWxkKTtcbiAgICB9XG5cbiAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgfVxufVxuXG52YXIgc2luZ2xldG9uID0gbnVsbDtcbnZhciBzaW5nbGV0b25Db3VudGVyID0gMDtcblxuZnVuY3Rpb24gYWRkU3R5bGUob2JqLCBvcHRpb25zKSB7XG4gIHZhciBzdHlsZTtcbiAgdmFyIHVwZGF0ZTtcbiAgdmFyIHJlbW92ZTtcblxuICBpZiAob3B0aW9ucy5zaW5nbGV0b24pIHtcbiAgICB2YXIgc3R5bGVJbmRleCA9IHNpbmdsZXRvbkNvdW50ZXIrKztcbiAgICBzdHlsZSA9IHNpbmdsZXRvbiB8fCAoc2luZ2xldG9uID0gaW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMpKTtcbiAgICB1cGRhdGUgPSBhcHBseVRvU2luZ2xldG9uVGFnLmJpbmQobnVsbCwgc3R5bGUsIHN0eWxlSW5kZXgsIGZhbHNlKTtcbiAgICByZW1vdmUgPSBhcHBseVRvU2luZ2xldG9uVGFnLmJpbmQobnVsbCwgc3R5bGUsIHN0eWxlSW5kZXgsIHRydWUpO1xuICB9IGVsc2Uge1xuICAgIHN0eWxlID0gaW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMpO1xuICAgIHVwZGF0ZSA9IGFwcGx5VG9UYWcuYmluZChudWxsLCBzdHlsZSwgb3B0aW9ucyk7XG5cbiAgICByZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUoKSB7XG4gICAgICByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGUpO1xuICAgIH07XG4gIH1cblxuICB1cGRhdGUob2JqKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZVN0eWxlKG5ld09iaikge1xuICAgIGlmIChuZXdPYmopIHtcbiAgICAgIGlmIChuZXdPYmouY3NzID09PSBvYmouY3NzICYmIG5ld09iai5tZWRpYSA9PT0gb2JqLm1lZGlhICYmIG5ld09iai5zb3VyY2VNYXAgPT09IG9iai5zb3VyY2VNYXApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB1cGRhdGUob2JqID0gbmV3T2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVtb3ZlKCk7XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChsaXN0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9OyAvLyBGb3JjZSBzaW5nbGUtdGFnIHNvbHV0aW9uIG9uIElFNi05LCB3aGljaCBoYXMgYSBoYXJkIGxpbWl0IG9uIHRoZSAjIG9mIDxzdHlsZT5cbiAgLy8gdGFncyBpdCB3aWxsIGFsbG93IG9uIGEgcGFnZVxuXG4gIGlmICghb3B0aW9ucy5zaW5nbGV0b24gJiYgdHlwZW9mIG9wdGlvbnMuc2luZ2xldG9uICE9PSAnYm9vbGVhbicpIHtcbiAgICBvcHRpb25zLnNpbmdsZXRvbiA9IGlzT2xkSUUoKTtcbiAgfVxuXG4gIGxpc3QgPSBsaXN0IHx8IFtdO1xuICB2YXIgbGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpO1xuICByZXR1cm4gZnVuY3Rpb24gdXBkYXRlKG5ld0xpc3QpIHtcbiAgICBuZXdMaXN0ID0gbmV3TGlzdCB8fCBbXTtcblxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobmV3TGlzdCkgIT09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhc3RJZGVudGlmaWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGlkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbaV07XG4gICAgICB2YXIgaW5kZXggPSBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICAgIHN0eWxlc0luRG9tW2luZGV4XS5yZWZlcmVuY2VzLS07XG4gICAgfVxuXG4gICAgdmFyIG5ld0xhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShuZXdMaXN0LCBvcHRpb25zKTtcblxuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICB2YXIgX2lkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbX2ldO1xuXG4gICAgICB2YXIgX2luZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoX2lkZW50aWZpZXIpO1xuXG4gICAgICBpZiAoc3R5bGVzSW5Eb21bX2luZGV4XS5yZWZlcmVuY2VzID09PSAwKSB7XG4gICAgICAgIHN0eWxlc0luRG9tW19pbmRleF0udXBkYXRlcigpO1xuXG4gICAgICAgIHN0eWxlc0luRG9tLnNwbGljZShfaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxhc3RJZGVudGlmaWVycyA9IG5ld0xhc3RJZGVudGlmaWVycztcbiAgfTtcbn07IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHRpZDogbW9kdWxlSWQsXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSAobW9kdWxlKSA9PiB7XG5cdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuXHRcdCgpID0+IChtb2R1bGVbJ2RlZmF1bHQnXSkgOlxuXHRcdCgpID0+IChtb2R1bGUpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCB7IGE6IGdldHRlciB9KTtcblx0cmV0dXJuIGdldHRlcjtcbn07IiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImltcG9ydCAnLi90ZXN0LWFycmF5LXRvLXRhYmxlLmNzcydcblxuaW1wb3J0IHsgQXJyYXlUb1RhYmxlIH0gZnJvbSAnLi4vLi4vLi4vanMvdG9vbGJveC9BcnJheVRvVGFibGUnXG5cblxuJCggKCkgPT4ge1xuICBjb25zdCBzZWxlY3RvciA9ICcjdGhlLXRhYmxlJ1xuXG4gIGNvbnN0IG51bUl0ZW1zID0gMTUwXG5cbiAgbGV0IGRhdGEgPSBbXVxuICBmb3IgKGxldCBpID0gMDsgaSA8IG51bUl0ZW1zOyBpKyspIHtcbiAgICBkYXRhLnB1c2goTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKjEwMDAwKSlcbiAgfVxuXG4gIGxldCBhMnQgPSBuZXcgQXJyYXlUb1RhYmxlKHtcbiAgICBkYXRhOiBkYXRhLFxuICAgIGl0ZW1zUGVyUm93OiA5LFxuICAgIHRhYmxlQ2xhc3NlczogWyAnbnVtYmVyLXRhYmxlJ10sXG4gICAgZ2V0VGRDbGFzc2VzOiAoaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgIGxldCByYW5rID0gTWF0aC5mbG9vcihpdGVtLzEwMDApXG4gICAgICByZXR1cm4gWyAnaXRlbScsICdyYW5rLScgKyByYW5rLCAnaXRlbS0nICsgaW5kZXhdXG4gICAgfSxcbiAgICBnZXRUckNsYXNzZXM6ICAocm93LCBmaXJzdEl0ZW1JbmRleCkgPT4ge1xuICAgICAgIGlmIChyb3cgJSAyICkge1xuICAgICAgICAgcmV0dXJuIFsgJ29kZC1yb3cnXVxuICAgICAgIH1cbiAgICAgICByZXR1cm4gWydldmVuLXJvdyddXG4gICAgfVxuICB9KVxuXG4gICQoc2VsZWN0b3IpLmh0bWwoYTJ0LnJlbmRlcigpKVxufSkiXSwic291cmNlUm9vdCI6IiJ9