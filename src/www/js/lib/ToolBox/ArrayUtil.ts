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

/**
 * Returns array with only unique elements from the given array
 * Does not work with object elements (i.e., only strings, numbers and boolean are supported
 * @param theArray
 */
export function uniq(theArray: any[]): any[] {
  return theArray.filter( (item, pos) =>{ return theArray.indexOf(item) === pos})
}

export function swapElements(theArray: any[], index1: number, index2: number): any[] {
  let element1 = theArray[index1]
  theArray[index1] = theArray[index2]
  theArray[index2] = element1
  return theArray
}

export function arraysAreEqual(array1: any[], array2: any[], comparisonFunction = function (a: any,b: any) { return a===b }, depth= 1) {
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

export function varsAreEqual(var1:any, var2:any) {
  return JSON.stringify(var1) === JSON.stringify(var2)
}

/**
 * Returns true if both arrays have the same values
 * Only works if the arrays are composed of values that can be represented as strings
 * @param array1
 * @param array2
 */
export function arraysHaveTheSameValues(array1: any[], array2: any[]) {
  return array1.sort().join(' ') === array2.sort().join(' ')
}


export function prettyPrintArray(array: any[]) {
  return '[' + array.map( (e) => { return e.toString()}).join(', ') + ']'
}
export function createSequenceArray(from: number, to: number, increment = 1): number[] {
  let theArray = []
  for (let i = from; i <= to; i+=increment) {
    theArray.push(i)
  }
  return theArray
}

export function createIndexArray(size: number): number[] {
  return createSequenceArray(0, size-1, 1)
}

export function flatten(theArray: any[]): any[] {
  let flattenedArray: any[] = []
  theArray.forEach( (arrayElement) => {
    if (Array.isArray(arrayElement)) {
      flattenedArray.push(...flatten(arrayElement))
    } else {
      flattenedArray.push(arrayElement)
    }
  })
  return flattenedArray
}

export function numericSort(theArray: any[], asc = true): any[] {
  return theArray.sort( (a,b) => {
    if (asc) { return a-b}
    return b-a
  })
}

/**
 * Sorts an array based on the numeric value of a field in its elements
 */
export function numericFieldSort(theArray:any[], fieldName: string, asc= true): any[] {
  return theArray.sort( (a,b) => {
    if (asc) { return a[fieldName]-b[fieldName]}
    return b[fieldName]-a[fieldName]
  })
}

/**
 * Sorts an array based on the string value of a field in its elements
 * @param theArray
 * @param fieldName
 * @param asc
 */
export function stringFieldSort(theArray: any[], fieldName: string, asc = true): any[] {
  return theArray.sort( (a,b) => {
    let x = a[fieldName].toLowerCase()
    let y = b[fieldName].toLowerCase()
    if (x < y) {
      return asc ? -1 : 1
    }
    if (x > y) {
      return asc ? 1 : -1
    }
    return 0
  })
}

/**
 * Pushes all the elements of an array into another one
 * @deprecated use  `theArray.push(...arrayToPush)`
 */
export function pushArray(theArray: any[], arrayToPush:any[]) {
  return theArray.push(...arrayToPush)
}

export function allTrue(someArray: boolean[]) {
  return someArray.every( element => element)
}