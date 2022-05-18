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
export function uniq(theArray) {
  return theArray.filter( (item, pos) =>{ return theArray.indexOf(item) === pos})
}

export function swapElements(theArray, index1, index2) {
  let element1 = theArray[index1]
  theArray[index1] = theArray[index2]
  theArray[index2] = element1
  return theArray
}

export function arraysAreEqual(array1, array2, comparisonFunction = function (a,b) { return a===b }, depth= 1) {
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

export function varsAreEqual(var1, var2) {
  return JSON.stringify(var1) === JSON.stringify(var2)
}

/**
 * Returns true if both arrays have the same values
 * Only works if the arrays are composed of values that can be represented as strings
 * @param array1
 * @param array2
 */
export function arraysHaveTheSameValues(array1, array2) {
  return array1.sort().join(' ') === array2.sort().join(' ')
}


export function prettyPrintArray(array) {
  return '[' + array.map( (e) => { return e.toString()}).join(', ') + ']'
}

export function shuffleArray(array) {
  array.sort(() => Math.random() - 0.5)
  return array
}

export function createSequenceArray(from, to, increment = 1) {
  let theArray = []
  for (let i = from; i <= to; i+=increment) {
    theArray.push(i)
  }
  return theArray
}

export function createIndexArray(size) {
  return createSequenceArray(0, size-1, 1)
}

export function flatten(theArray) {
  let flattenedArray = []
  theArray.forEach( (arrayElement) => {
    if (Array.isArray(arrayElement)) {
      pushArray(flattenedArray, flatten(arrayElement))
    } else {
      flattenedArray.push(arrayElement)
    }
  })
  return flattenedArray
}

export function numericSort(theArray, asc = true) {
  return theArray.sort( (a,b) => {
    if (asc) { return a-b}
    return b-a
  })
}

export function pushArray(theArray, arrayToPush) {
  arrayToPush.forEach( (e) => {
    theArray.push(e)
  })
}

/**
 *
 * @param {array} sourceArray
 * @param {any} separator
 */
export function joinWithArray(sourceArray, separator) {
  let newArray = []
  if (sourceArray.length === 0) {
    return []
  }

  for (let i=0; i < sourceArray.length -1; i++) {
    newArray.push(sourceArray[i])
    newArray.push(separator)
  }

  newArray.push(sourceArray[sourceArray.length-1])
  return newArray
}


export function maxValue(theArray) {
  return theArray.reduce( (currentMax, val) => { return Math.max(currentMax, val)})
}

/**
 *
 * @param {any[]}someArray
 */
export function makeCopyOfArray(someArray) {
  let newArray = []
  for (let i = 0; i < someArray.length; i++) {
    newArray.push(someArray[i])
  }
  return newArray
}