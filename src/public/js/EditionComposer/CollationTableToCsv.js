/**
 * Generates a CSV string from the collation table
 * @returns {string}
 */
export function generateCsvStringFromCtData(ctData, showNormalizations) {
  let sep = ','
  let titles = ctData['witnessTitles']
  let numWitnesses = ctData['witnesses'].length
  let collationMatrix = ctData['collationMatrix']
  let order = ctData['witnessOrder']

  let output = ''
  for (let i=0; i < numWitnesses; i++) {
    let witnessIndex = order[i]
    let title = titles[witnessIndex]
    output += title + sep
    let ctRefRow = collationMatrix[witnessIndex]
    for (let tkRefIndex = 0; tkRefIndex < ctRefRow.length; tkRefIndex++) {
      let tokenRef = ctRefRow[tkRefIndex]
      let tokenCsvRep = ''
      if (tokenRef !== -1 ) {
        let token = ctData.witnesses[witnessIndex].tokens[tokenRef]
        tokenCsvRep = getCsvRepresentationForToken(token, showNormalizations)
      }
      output += tokenCsvRep + sep
    }
    output += "\n"
  }
  return output
}

function getCsvRepresentationForToken(tkn, showNormalizations) {
  if (tkn.empty) {
    return ''
  }
  let text = tkn.text
  if (showNormalizations) {
    text = tkn['norm']
  }
  return '"' + text + '"'
}
