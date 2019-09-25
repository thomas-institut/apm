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


  constructor(optionsDefinition, contextStr = '') {
    this.optionsDefinition = optionsDefinition
    this.contextStr = contextStr
  }

  getCleanOptions(options) {
    let cleanOptions = {}
    for(const option in this.optionsDefinition) {
      //console.log('Processing ' + option )
      let optionDef = this.optionsDefinition[option]
      //console.log(optionDef)
      if (typeof (options[option]) === 'undefined') {
        if (optionDef.required) {
          this.report('Required option ' + option + ' not found', true)
          //continue
        }
        if (typeof (optionDef.default) === 'undefined') {
          this.report('No default defined for option ' + option, true)
          //continue
        }
        cleanOptions[option] = optionDef.default
        continue
      }

      if (typeof (optionDef.default) !== 'undefined') {
        cleanOptions[option] = optionDef.default
      }

      let typeOK = true
      let additionalCheckOk = true
      if (typeof (optionDef.type) === 'string' && typeof (options[option]) !== optionDef.type) {
        this.report('Option ' + option + ' must be of type ' + optionDef.type + ', ' + typeof (options[option]) + ' found, using default', false)
        typeOK = false
      }

      if (typeof (optionDef.checker) === 'function' && !optionDef.checker(options[option])) {
        this.report('Option ' + option + ' does not pass checks: ' + optionDef.checkDescription + ', using default', false)
        additionalCheckOk = false
      }

      if (typeOK && additionalCheckOk) {
        cleanOptions[option] = options[option]
      }
    }
    return cleanOptions
  }

  getDefaults() {
    return this.getCleanOptions({})
  }

  report(message, isError = true) {
    let msg = this.contextStr

     msg +=  ': ' + message



    if (isError) {
      console.error(msg)
      throw msg
    } else {
      console.warn(msg)
    }
  }

}