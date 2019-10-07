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
 * Utility class to check and generate a "clean"  options object
 *
 * The optionsDefinition object passed to the constructor should have as properties the
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

  optionsDefinition: object
  contextStr: String

  constructor(options : object, contextStr : String) {
    this.optionsDefinition = options
    this.contextStr = contextStr
  }

  isOfType(value : any, type: String) : boolean {
    switch (type) {
      case 'string':
      case 'number':
      case 'object':
      case 'boolean':
      case 'function':
        // normal javascript type
        return (typeof(value) === type)

      case 'NonEmptyString':
        return typeof(value) === 'string' && value !== ''

      case 'NumberGreaterThanZero':
        return typeof(value) === 'number' && value > 0

      case 'NonZeroNumber':
        return typeof(value) === 'number' && value !== 0

      case 'Array':
        return Array.isArray(value)

      default:
        this.error('Unsupported type \'' + type + '\' found in options definition')

    }
  }

  isUndefined(value : any) : boolean {
    return typeof (value) === 'undefined'
  }

  getCleanOptions(optionsObject : object) {
    let cleanOptions = {}
    for(const optionName in this.optionsDefinition) {
      let optionDefinition = this.optionsDefinition[optionName]

      if (this.isUndefined(optionsObject[optionName])) {
        // optionName is NOT  in optionsObject
        if (optionDefinition.required) {
          this.error('Required option \'' + optionName + '\' not found')
        }
        if (this.isUndefined( optionDefinition.default)) {
          this.error('No default defined for ' + optionName)
        }
        cleanOptions[optionName] = optionDefinition.default
        continue
      }

      // optionName is present in optionsObject
      let typeOK = true
      let additionalCheckOk = true
      // first, check just for the given type
      if (this.isOfType(optionDefinition.type, 'NonEmptyString') && !this.isOfType(optionsObject[optionName], optionDefinition.type)) {
        this.warn(optionName + ' must be ' + optionDefinition.type + ', ' + optionsObject[optionName] + ' given, will assign default')
        typeOK = false
      }
      // if we have an objectClass, check for it
      if (typeOK && optionDefinition.type === 'object' && !this.isUndefined(optionDefinition.objectClass)) {
        if (!(optionsObject[optionName] instanceof optionDefinition.objectClass )) {
          this.warn(optionName + ' must be an object of class ' + optionDefinition.objectClass.name + ', ' + optionsObject[optionName].constructor.name  + ' given, will assign default')
          typeOK = false
        }
      }

      if (this.isOfType(optionDefinition.checker, 'function') && !optionDefinition.checker(optionsObject[optionName])) {
        this.warn(optionName + ' must be ' + optionDefinition.checkDescription + ', ' + optionsObject[optionName] + ' given, will assign default')
        additionalCheckOk = false
      }

      if (typeOK && additionalCheckOk) {
        cleanOptions[optionName] = optionsObject[optionName]
      } else {
        if (this.isUndefined(optionDefinition.default))  {
          this.error('Given ' + optionName + ' is not valid, but there is no default value defined')
        } else {
          cleanOptions[optionName] = optionDefinition.default
        }
      }
    }
    return cleanOptions
  }

  getDefaults() : object {
    return this.getCleanOptions({})
  }

  errorMessage(msg: String) : String {
    return this.contextStr + ': ' + msg
  }

  error(message : String) {
    console.error(this.errorMessage(message))
    throw this.errorMessage(message)
  }

  warn(message : String) {
    console.warn(this.errorMessage(message))
  }

}