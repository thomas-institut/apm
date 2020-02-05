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

class Matrix {

  constructor(nRows, nCols, defaultValue = '') {
    this.nRows = nRows
    this.nCols = nCols
    this.defaultValue = defaultValue
    this.initializeMatrix()

  }

  setFromArray(theArray) {
    this.nRows = theArray.length
    this.nCols = 0;
    if (this.nRows > 0) {
      this.nCols = theArray[0].length
    }
    this.initializeMatrix()
    for(let row = 0; row < this.nRows; row++) {
      for (let col = 0; col < theArray[row].length; col++) {
        this.setValue(row, col, theArray[row][col])
      }
    }
  }

  initializeMatrix() {
    this.theMatrix = []
    for (let row=0; row < this.nRows; row++) {
      this.theMatrix[row]  = []
      for (let col=0; col < this.nCols; col++) {
        this.theMatrix[row][col] = this.defaultValue
      }
    }
  }


  deleteColumn(theCol) {
    if (theCol < 0 || theCol >= this.nCols) {
      console.error('Column to delete does not exist: ' + theCol)
      return
    }

    for(let row=0; row < this.nRows; row++) {
      this.theMatrix[row].splice(theCol, 1)
    }
    this.nCols--
  }

  addColumnAfter(afterCol, defaultValue = '') {
    if (afterCol < -1 ||afterCol > (this.nCols - 1) ) {
      console.error('Cannot add column after ' + afterCol)
      return
    }

    for(let row=0; row < this.nRows; row++) {
      this.theMatrix[row].push(defaultValue)
      // at this point the row has this.nCols+1 elements
      for(let col=this.nCols; col > afterCol+1; col--) {
        this.theMatrix[row][col] = this.theMatrix[row][col-1]
      }
      this.theMatrix[row][afterCol+1] = defaultValue
    }
    this.nCols++
  }

  getValue(row, col) {
    if (row < 0 || col < 0 || row >= this.nRows || col >= this.nCols) {
      console.error('Out of range row/col getting value: ' + row + ':' + col)
    }
    return this.theMatrix[row][col]
  }

  setValue(row, col, value) {
    if (row < 0 || col < 0 || row >= this.nRows || col >= this.nCols) {
      console.error('Out of range row/col setting value: ' + row + ':' + col)
    }
    this.theMatrix[row][col] = value
  }

  isColumnEmpty(col, isCellEmptyFunction) {
    for(let row = 0; row < this.nRows; row++) {
      if (!isCellEmptyFunction(this.getValue(row, col))) {
        return false
      }
    }
    return true
  }

  logMatrix(title) {
    console.log('Matrix ' + title + ': ' + this.nRows +  ' rows x ' + this.nCols + ' cols')
    console.log(this.theMatrix)
  }

}