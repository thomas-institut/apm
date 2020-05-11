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

const FOLIATION_RECTOVERSO = 1
const FOLIATION_CONSECUTIVE = 2 

const FOLIATION_START_SAME_AS_RANGE = -1


/**
 *  Utility functions to deal with page ranges
 *  
 *  A page range [0, 0] is considered the empty range
 * 
 */
class PageRange {
  
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
  
  foliate(pageNumber, type = FOLIATION_RECTOVERSO, start=FOLIATION_START_SAME_AS_RANGE, prefix = '', suffix='') {
    if (!this.isInRange(pageNumber)) {
      return ''
    }
    
    if (start === FOLIATION_START_SAME_AS_RANGE) {
      start = this.a
    }
    
    if (start < 0) {
      return ''
    }
    
    let foliationNumber = ''
    switch (type) {
      case FOLIATION_CONSECUTIVE:
        foliationNumber = pageNumber - this.a + start
        break
      
      case FOLIATION_RECTOVERSO:
        let pagePos = pageNumber - this.a
        let rectoVerso = 'r'
        if (pagePos % 2) {
          rectoVerso = 'v'
        }
        foliationNumber = (Math.floor(pagePos/2) + start) + rectoVerso
        break
        
      default:
        return ''
    }
    
    return prefix + foliationNumber + suffix
  }
  
  toStringWithFoliation(ini = '', sep = ' - ', end = '', type = FOLIATION_RECTOVERSO, start=FOLIATION_START_SAME_AS_RANGE, prefix = '', suffix=''){
    if (this.isEmpty()) {
      // empty range
      return '-'
    }
    let first = this.foliate(this.a, type, start, prefix, suffix)
    let last = this.foliate(this.b, type, start, prefix, suffix)
    
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