class CollationTableUtil {

  static  genVariantsMatrix(refMatrix, witnesses) {
    let variantMatrix = new Matrix(refMatrix.nRows, refMatrix.nCols)

    for (let col=0; col < refMatrix.nCols; col++) {
      let refCol = refMatrix.getColumn(col)
      let textCol = []
      for(let row=0; row < refMatrix.nRows; row++) {
        let ref = refCol[row]
        if (ref=== -1) {
          textCol.push('')
          continue
        }
        if (witnesses[row].tokens[ref].normalizedText !== undefined) {
          textCol.push(witnesses[row].tokens[ref].normalizedText)
        } else {
          textCol.push(witnesses[row].tokens[ref].text)
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

}