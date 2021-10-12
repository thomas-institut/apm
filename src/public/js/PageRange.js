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
/*eslint-env es6*/
/*eslint-env jquery*/

/*eslint no-var: "error"*/
/*eslint default-case: "error"*/
/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

import * as FoliationType from './constants/FoliationType'



/**
 *  Utility functions to deal with page ranges
 *  
 *  A page range [0, 0] is considered the empty range
 * 
 */
export class PageRange {
  
  constructor (first = 0, last = 0, upperBound = Number.MAX_SAFE_INTEGER) {
    if (upperBound <= 0) {
      // negative upper bound is not allowed and results
      // in the empty range
      this.upperBound = Number.MAX_SAFE_INTEGER
      this.setRange(0,0)
    } else {
      this.upperBound = upperBound
      this.setRange(first, last, upperBound)
    }
  }

  setRange(first = 0, last = 0) {
    
    if (first < 0 || last < 0) {
      // negative numbers not allowed, result in the empty range
      this.a = 0
      this.b = 0
      return false
    }
    if (first > this.upperBound) {
      // out of bounds range, results in the empty range
      this.a = 0
      this.b = 0
      return false
    }
    
    if (last > this.upperBound) {
      // cap at upperBound
      last = this.upperBound
    }
    if (last < first) {
      // invalid range, results in the empty range
      first = 0
      last = 0
    }
    
    this.a = first
    this.b = last
  }
  
  setUpperBound(upperBound) {
    this.upperBound = upperBound
    this.setRange(this.a, this.b)
  }
  
  getLength() {
    if (this.isEmpty()) {
      return 0
    }
    return this.b - this.a + 1 
  }
  
  toString(ini = '', sep = ' - ', end = '') {
    if (this.isEmpty()) {
      // empty range
      return '-'
    }
    if (this.a === this.b) {
      return ini + this.a + end
    }
    return ini + this.a + sep + this.b + end
  }
  
  isEmpty() {
    return this.a === 0 && this.b === 0
  }
  
  isInRange(n) {
    return n >= this.a && n <= this.b;
  }
  
  foliate(pageNumber, type = FoliationType.FOLIATION_RECTOVERSO, start= FoliationType.FOLIATION_START_SAME_AS_RANGE, prefix = '', suffix='', reverse = false) {
    //console.log(`Foliating page number ${pageNumber}`)
    if (!this.isInRange(pageNumber)) {
      //console.log(`Not in range`)
      return ''
    }
    
    if (start === FoliationType.FOLIATION_START_SAME_AS_RANGE) {
      start = this.a
    }
    //console.log(`Start = ${start}`)
    
    if (start < 0) {
      return ''
    }
    
    let foliationNumber = ''
    switch (type) {
      case FoliationType.FOLIATION_CONSECUTIVE:
        foliationNumber = reverse ?  start - (pageNumber - this.b) : start + (pageNumber - this.a)
        break
      
      case FoliationType.FOLIATION_RECTOVERSO:
      case FoliationType.FOLIATION_AB:
      case FoliationType.FOLIATION_LEFTRIGHT:
        let pagePos = reverse? this.b - pageNumber : pageNumber - this.a
        let rectoVerso = FoliationType.foliationAffixes[type].a
        if (pagePos % 2) {
          rectoVerso = FoliationType.foliationAffixes[type].b
        }
        foliationNumber = (Math.floor(pagePos/2) + start) + rectoVerso
        break
        
      default:
        return ''
    }
    
    return prefix + foliationNumber + suffix
  }

  /**
   *
   * @param ini
   * @param sep
   * @param end
   * @param type
   * @param start
   * @param prefix
   * @param suffix
   * @param reverse
   * @return {string}
   */
  toStringWithFoliation(ini = '', sep = ' - ', end = '',
    type = FoliationType.FOLIATION_RECTOVERSO, start=FoliationType.FOLIATION_START_SAME_AS_RANGE, prefix = '', suffix='', reverse = false){
    if (this.isEmpty()) {
      // empty range
      return '-'
    }
    let first = this.foliate(this.a, type, start, prefix, suffix, reverse)
    let last = this.foliate(this.b, type, start, prefix, suffix, reverse)
    
    if (this.a === this.b) {
      return ini + first + end
    }
    return ini + first + sep + last + end
  }
  
  toArray() {
    if (this.isEmpty()) {
      return []
    }
    
    let theArray = []
    for (let i = this.a; i <=this.b; i++) {
      theArray.push(i)
    }
    return theArray
    
  }
  
}