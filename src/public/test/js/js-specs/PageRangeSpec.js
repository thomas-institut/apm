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


describe("PageRange", function() {
  
  describe("basic operations", function (){
    it("should create valid ranges", function (){
      let range = new PageRange(1,2)
      expect(range.isEmpty()).toBe(false)
      expect(range.a).toBe(1)
      expect(range.b).toBe(2)
     
      let range2 = new PageRange(1,2, 100)
      //console.log(range2)
      expect(range2.isEmpty()).toBe(false)
      expect(range2.a).toBe(1)
      expect(range2.b).toBe(2)
    })
    
    it("should detect invalid ranges", function (){
      let range = new PageRange(2,1)
      expect(range.isEmpty()).toBe(true)
      
      let range2 = new PageRange(1,200, 100)
      expect(range2.isEmpty()).toBe(false)
      expect(range2.a).toBe(1)
      expect(range2.b).toBe(100)
      
      let range3 = new PageRange(200,205, 100)
      expect(range3.isEmpty()).toBe(true)
      
      let range4 = new PageRange(10, 20)
      expect(range4.isEmpty()).toBe(false)
      range4.setUpperBound(15)
      expect(range4.isEmpty()).toBe(false)
      expect(range4.a).toBe(10)
      expect(range4.b).toBe(15)
    })
    
    it("should tell whether a number is in the range", function (){
      let range = new PageRange(10, 20)
      expect(range.isInRange(10)).toBe(true)
      expect(range.isInRange(15)).toBe(true)
      expect(range.isInRange(20)).toBe(true)
      expect(range.isInRange(9)).toBe(false)
      expect(range.isInRange(21)).toBe(false)
      expect(range.isInRange(0)).toBe(false)
      expect(range.isInRange(-25)).toBe(false)
      expect(range.isInRange('someString')).toBe(false)
      expect(range.isInRange('15a')).toBe(false)
    })
    
    it("should convert to an array of numbers", function () {
      let range = new PageRange(0, 0)
      expect(range.toArray()).toEqual([])
      let range2 = new PageRange(10, 19)
      let theArray = range2.toArray()
      expect(theArray.length).toBe(10)
      expect(theArray[0]).toBe(10)
    })
   
  })
  
  describe("string operations", function() {
    it("should provide basic string representations", function(){
      let range = new PageRange(20, 30)
      expect(range.toString('[', ', ', ']')).toBe('[20, 30]')
      expect(range.toString()).toBe('20 - 30')
      range.setRange(20, 20)
      expect(range.toString('[', ', ', ']')).toBe('[20]')
      expect(range.toString()).toBe('20')
      range.setRange(0,0) 
      expect(range.toString()).toBe('-')
      
    })
    
  })
  
  describe("foliation operations", function() {
    it("should detect errors in foliation function calls", function() {
      let range = new PageRange(20, 30)
      expect(range.foliate(1)).toBe('')
      expect(range.foliate(35)).toBe('')
      expect(range.foliate(20, FoliationType.FOLIATION_CONSECUTIVE, -2)).toBe('')
      expect(range.foliate(20, FoliationType.FOLIATION_CONSECUTIVE, -2)).toBe('')
    })
    
    it("should foliate consecutively", function() {
      let range = new PageRange(20, 29)
      expect(range.foliate(20, FoliationType.FOLIATION_CONSECUTIVE, FoliationType.FOLIATION_START_SAME_AS_RANGE, 'x', 'bis')).toBe('x20bis')
      expect(range.foliate(20, FoliationType.FOLIATION_CONSECUTIVE, 1, 'x', 'bis')).toBe('x1bis')
      expect(range.foliate(29, FoliationType.FOLIATION_CONSECUTIVE, 1, 'x', 'bis')).toBe('x10bis')
      expect(range.foliate(20, FoliationType.FOLIATION_CONSECUTIVE, 100, 'x', 'bis')).toBe('x100bis')
      expect(range.foliate(29, FoliationType.FOLIATION_CONSECUTIVE, 100, 'x', 'bis')).toBe('x109bis')
    })
    
    it("should foliate recto/verso", function() {
      let range = new PageRange(20, 29)
      expect(range.foliate(20, FoliationType.FOLIATION_RECTOVERSO, FoliationType.FOLIATION_START_SAME_AS_RANGE, 'x-', '-bis')).toBe('x-20r-bis')
      expect(range.foliate(20, FoliationType.FOLIATION_RECTOVERSO, 1, 'x-', '-bis')).toBe('x-1r-bis')
      expect(range.foliate(21, FoliationType.FOLIATION_RECTOVERSO, 1, 'x-', '-bis')).toBe('x-1v-bis')
      expect(range.foliate(22, FoliationType.FOLIATION_RECTOVERSO, 1, 'x-', '-bis')).toBe('x-2r-bis')
      expect(range.foliate(23, FoliationType.FOLIATION_RECTOVERSO, 1, 'x-', '-bis')).toBe('x-2v-bis')
      expect(range.foliate(29, FoliationType.FOLIATION_RECTOVERSO, 1, 'x-', '-bis')).toBe('x-5v-bis')
      expect(range.foliate(20, FoliationType.FOLIATION_RECTOVERSO, 100, 'x-', '-bis')).toBe('x-100r-bis')
      expect(range.foliate(29, FoliationType.FOLIATION_RECTOVERSO, 100, 'x-', '-bis')).toBe('x-104v-bis')
    })
    
    it("should provide string representations with foliation", function () {
      let range = new PageRange(20, 29)
      expect(range.toStringWithFoliation('[',' - ', ']')).toBe('[20r - 24v]')
      expect(range.toStringWithFoliation('[',' - ', ']', FoliationType.FOLIATION_RECTOVERSO, 1)).toBe('[1r - 5v]')
      expect(range.toStringWithFoliation('',' - ', '', FoliationType.FOLIATION_CONSECUTIVE, 1, 'x')).toBe('x1 - x10')
    })
    
    
  })
  
})
  