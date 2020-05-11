import { Matrix } from './Matrix.js'

/**
 * Generates a matrix with all the textual variants in all columns ranked
 * @param refMatrix matrix of references (i.e., from a collation table)
 * @param witnesses array of witnesses
 * @param witnessOrder  array that maps the row indexes in refMatrix to the indexes in the witnesses array;  order[refMatrixRow] = witnessIndex
 * @returns {Matrix}
 */
export function genVariantsMatrix(refMatrix, witnesses, witnessOrder) {
  let variantMatrix = new Matrix(refMatrix.nRows, refMatrix.nCols)

  for (let col=0; col < refMatrix.nCols; col++) {
    let refCol = refMatrix.getColumn(col)
    let textCol = []
    for(let row=0; row < refMatrix.nRows; row++) {
      let ref = refCol[row]
      if (ref === undefined) {
        console.error(`Found undefined reference in collation table, row ${row}, col ${col}, ref ${ref}`)
      }
      //console.log('row ' + row + ' col ' + col + ' ref ' +  ref)
      if (ref=== -1) {
        textCol.push('')
        continue
      }
      let witnessIndex = witnessOrder[row]
      let witness = witnesses[witnessIndex]
      if (witness.tokens[ref] === undefined) {
        console.error(`Found undefined token for reference, witness ${witnessIndex}, row ${row}, col ${col}, ref ${ref}`)
      }
      if (witness.tokens[ref]['normalizedText'] !== undefined) {
        textCol.push(witness.tokens[ref]['normalizedText'])
      } else {
        textCol.push(witness.tokens[ref].text)
      }

    }
    //console.log(textCol)
    let ranks = rankVariants(textCol)
    for(let row=0; row < refMatrix.nRows; row++) {
      variantMatrix.setValue(row, col, ranks[row])
    }
  }
  return variantMatrix
}


/**
 * compares two arrays of arrays to see if they're equal
 * @param matrix1
 * @param matrix2
 */
export function collationMatricesAreEqual(matrix1, matrix2) {
  return ApmUtil.arraysAreEqual(matrix1, matrix2, function(a,b){return a===b}, 2)
}

function rankVariants(stringArray) {
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