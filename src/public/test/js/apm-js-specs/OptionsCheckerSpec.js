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

/* global expect*/

describe("OptionsChecker", function() {

  describe("Basic checking", function (){
    it("should generate defaults", function (){
      let optionsDef = {
        option1 : { default: 'defaultOption1'},
        option2 : { default: 'defaultOption2'}
      }

      let oc = new OptionsChecker(optionsDef, 'Defaults Test')

      let defaults = oc.getDefaults()
      expect(defaults.option1).toBe('defaultOption1')
      expect(defaults.option2).toBe('defaultOption2')

      let optionsDef2 = { option1: {}, option2: { default: 'defaultOption2'}}
      let oc2 = new OptionsChecker(optionsDef2, 'No Default Test')
      expect(function(){oc2.getDefaults()}).toThrow()
    })

    it('should throw error on missing required parameters', function () {
      let optionsDef = {
        option1 : { required: true},
        option2 : { default: 'defaultOption2'}
      }
      let oc = new OptionsChecker(optionsDef, 'Required Parameters Test')

      expect(function(){oc.getCleanOptions({})}).toThrow()

    })

    it('should throw error on wrong type', function () {
      let optionsDef = {
         option2 : { type: 'someBadType', default: 'defaultOption2'}
      }
      let oc = new OptionsChecker(optionsDef, 'Wrong Type Test')

      expect(function(){oc.getCleanOptions({ option2: 123 })}).toThrow()

    })

    it ("should check types correctly", function () {
      let optionsDef = {
        option1 : { type: 'string', default: 'defaultOption1'},
        option2 : { type: 'number', default: 102},
        option3 : { type: 'NonEmptyString', default: 'test'},
        option4 : { type: 'NumberGreaterThanZero', default: 104},
        option5 : { type: 'NonZeroNumber', default: 105},
        option6 : { type: 'Array', default: []},
      }

      let oc = new OptionsChecker(optionsDef, 'Types Test')

      let testOptions1 = {
        option1: {},
        option2: 'somestring',
        option3: '',
        option4: -1,
        option5: 0,
        option6: {}
        }
      let d1 = oc.getCleanOptions(testOptions1)
      expect(d1.option1).toBe('defaultOption1')
      expect(d1.option2).toBe(102)
      expect(d1.option3).toBe('test')
      expect(d1.option4).toBe(104)
      expect(d1.option5).toBe(105)
      expect(d1.option6).toEqual([])

      let testOptions2 = {
        option1: 'myString',
        option2: 1002,
        option3: 'someString',
        option4: 1004,
        option5: 1005,
        option6: [ 1, 2, 3 ]
      }
      let d2 = oc.getCleanOptions(testOptions2)
      expect(d2).toEqual(testOptions2)

    } )

    it ("should call checker functions", function () {
      let optionsDef = {
        option1 : { type: 'string', default: 'defaultOption1'},
        option2 : { type: 'number', default: 2, checker: function(v) { return v>0 }, checkDescription: 'greater than 0'}
      }

      let oc = new OptionsChecker(optionsDef, 'Checker Function Test')

      let testOptions1 = { option1: 2, option2: -1}
      let d1 = oc.getCleanOptions(testOptions1)
      expect(d1.option1).toBe('defaultOption1')
      expect(d1.option2).toBe(2)

      let testOptions2 = { option1: 'myValue', option2: 4}
      let d2 = oc.getCleanOptions(testOptions2)
      expect(d2.option1).toBe('myValue')
      expect(d2.option2).toBe(4)
    } )

    it('should throw an error on undefined default for non-valid options', function () {
      let optionsDef = {
        option1 : { type: 'number'},
      }

      let oc = new OptionsChecker(optionsDef, 'Undefined Default Test')
      expect(function(){oc.getCleanOptions({ option1: 'somestring' })}).toThrow()
    })

    it ('should deal with object classes', function() {

      let optionsDef = {
        option1 : { type: 'object', objectClass: Date }
      }

      let oc = new OptionsChecker(optionsDef, 'objectClasses')

      let d = oc.getCleanOptions({ option1: new Date()})

      expect(d.option1).toBeDefined()
      expect(d.option1 instanceof Date).toBeTrue()

      expect(function(){oc.getCleanOptions({ option1: new String('test')})}).toThrow()

    })

  })

})