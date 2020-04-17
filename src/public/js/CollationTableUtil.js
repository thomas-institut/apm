class CollationTableUtil {

  static  genVariantsMatrix(refMatrix, witnesses, witnessOrder) {
    //console.log('genVariantsMatrix')
    //refMatrix.logMatrix('refMatrix')
    let variantMatrix = new Matrix(refMatrix.nRows, refMatrix.nCols)

    for (let col=0; col < refMatrix.nCols; col++) {
      let refCol = refMatrix.getColumn(col)
      let textCol = []
      for(let row=0; row < refMatrix.nRows; row++) {
        let ref = refCol[row]
        //console.log('row ' + row + ' col ' + col + ' ref ' +  ref)
        if (ref=== -1) {
          textCol.push('')
          continue
        }
        let witness = witnesses[witnessOrder[row]]
        if (witness.tokens[ref]['normalizedText'] !== undefined) {
          textCol.push(witness.tokens[ref]['normalizedText'])
        } else {
          textCol.push(witness.tokens[ref].text)
        }

      }
      //console.log(textCol)
      let ranks = this.rankVariants(textCol)
      //console.log(ranks)
      for(let row=0; row < refMatrix.nRows; row++) {
        variantMatrix.setValue(row, col, ranks[row])
      }
    }
    return variantMatrix
  }

  static rankVariants(stringArray) {
    let countsByString = []
    for(const text of stringArray) {
      if (text === '') {
        continue
      }
      if (countsByString[text] === undefined) {
        countsByString[text] = 1
      } else {
        countsByString[text]++
      }
    }

    let countArray = []

    for(const aKey of Object.keys(countsByString)) {
      countArray.push({ text: aKey, count: countsByString[aKey]})
    }
    countArray.sort(function (a,b) { return b['count'] - a['count']})

    let rankObject = {}
    for(let i = 0; i < countArray.length; i++) {
      rankObject[countArray[i]['text']] = i
    }

    let ranks = []
    for(const text of stringArray) {
      if (text === '') {
        ranks.push(12345678)
        continue
      }
      ranks.push(rankObject[text])
    }
    return ranks
  }

  /**
   * compares two arrays of arrays to see if they're equal
   * @param matrix1
   * @param matrix2
   */
  static collationMatricesAreEqual(matrix1, matrix2) {

    return ApmUtil.arraysAreEqual(matrix1, matrix2, function(a,b){return a===b}, 2)
    // if (matrix1.length !== matrix2.length) {
    //   return false
    // }
    // for(let row = 0; row < matrix1.length; row++) {
    //   if(matrix1[row].length !== matrix2[row].length) {
    //     return false
    //   }
    //   for(let col= 0; col < matrix1[row].length; col++) {
    //     if (matrix1[row][col] !== matrix2[row][col]) {
    //       return false
    //     }
    //   }
    // }
    // return true
  }

}