/*
 *  Copyright (C) 2019 Universität zu Köln
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
 * Utility class to check and generate a "clean" options object
 *
 * The optionsDefinition object passed to the constructor should have as properties the
 * definition of each option to be checked. Each property, in turn, has the following
 * properties:
 *
 *   optionName:  {
 *     required: <true/false>  // optional, if not present it defaults to false
 *     default:  <default Value> // if required===true, the default value will be ignored
 *     type: 'js type'   // optional type requirement for the option
 *     checker: function (v) { .... }  // optional function that performs additional checks on the given value
 *     checkDescription:  <string description of additional check>
 *   }
 */
class OptionsChecker {


  constructor(options, contextStr) {
    this.optionsDefinition = options
    this.contextStr = contextStr
  }

  getCleanOptions(optionsObject) {
    let cleanOptions = {}
    for(const optionName in this.optionsDefinition) {
      let optionDefinition = this.optionsDefinition[optionName]

      if (typeof (optionsObject[optionName]) === 'undefined') {
        // optionName is NOT  in optionsObject
        if (optionDefinition.required) {
          this.error('Required option ' + optionName + ' not found')
        }
        if (typeof (optionDefinition.default) === 'undefined') {
          this.error('No default defined for option ' + optionName)
        }
        cleanOptions[optionName] = optionDefinition.default
        continue
      }

      // optionName is present in optionsObject


      let typeOK = true
      let additionalCheckOk = true
      if (typeof (optionDefinition.type) === 'string' && typeof (optionsObject[optionName]) !== optionDefinition.type) {
        this.warn('Option ' + optionName + ' must be of type ' + optionDefinition.type + ', ' + typeof (optionsObject[optionName]) + ' found, will use default')
        typeOK = false
      }

      if (typeof (optionDefinition.checker) === 'function' && !optionDefinition.checker(optionsObject[optionName])) {
        this.warn('Option ' + optionName + ' does not pass checks: ' + optionDefinition.checkDescription + ', will use default')
        additionalCheckOk = false
      }

      if (typeOK && additionalCheckOk) {
        cleanOptions[optionName] = optionsObject[optionName]
      } else {
        if (typeof (optionDefinition.default) !== 'undefined') {
          cleanOptions[optionName] = optionDefinition.default
        } else {
          this.error('Given option ' + optionName + ' does not pass checks, but there is no default value defined')
        }
      }
    }
    return cleanOptions
  }

  getDefaults() {
    return this.getCleanOptions({})
  }

  errorMessage(msg) {
    return this.contextStr + ': ' + msg
  }

  error(message) {
    console.error(this.errorMessage(message))
    throw this.errorMessage(message)
  }

  warn(message) {
    console.warn(this.errorMessage(message))
  }

}