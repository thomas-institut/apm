import { FmtText } from '../FmtText/FmtText.mjs'
import { deepCopy } from '../toolbox/Util.mjs'

const enDash = String.fromCodePoint(0x2013)


export class ApparatusUtil {

  static getLemmaComponents(apparatusEntryLemma, lemmaText) {
    let separator = ''
    let custom = false
    switch(apparatusEntryLemma) {
      case '':
      case 'dash':
        separator = `${enDash}`
        break

      case 'ellipsis':
        separator = '...'
        break

      default:
        custom = true
    }
    if (custom) {
      return { type: 'custom', text:  FmtText.getPlainText(apparatusEntryLemma) }
    }
    if (lemmaText === '') {
      lemmaText = 'pre'
    }
    let lemmaTextWords = lemmaText.split(' ')
    // if lemmaText is short,
    if (lemmaTextWords.length <= 3) {
      return {
        type: 'full',
        text:  lemmaText,
        numWords: lemmaTextWords.length
      }
    }
    return {
      type: 'shortened',
      from: lemmaTextWords[0],
      separator: separator,
      to:lemmaTextWords[lemmaTextWords.length-1],
    }
  }


  static getSiglaData(witnessData, sigla, siglaGroups) {
    let wData = deepCopy(witnessData)
    let wDataArray = wData.map ( (w) => {
      w.siglum = sigla[w.witnessIndex]
      return w
    })

    siglaGroups.forEach ( (sg) => {
      let siglaIndexes = wDataArray.map ( (w) => {
        // turn non-zero hands to -1 so that they are not matched by the sigla group
        return w.hand === 0 ? w.witnessIndex : -1
      })
      let matchedIndexes = sg.matchWitnesses(siglaIndexes)
      if (matchedIndexes.length !== 0) {
        // change the first matched witness to the group siglum
        let firstMatchedWitnessPosition = siglaIndexes.indexOf(matchedIndexes[0])
        //console.log(`First matched witness position in array: ${firstMatchedWitnessPosition}`)
        wDataArray[firstMatchedWitnessPosition].siglum = sg.siglum
        wDataArray[firstMatchedWitnessPosition].hand = 0
        wDataArray[firstMatchedWitnessPosition].witnessIndex = -1
        // filter out matched witnesses
        wDataArray = wDataArray.filter( (w) => {
          return matchedIndexes.indexOf(w.witnessIndex) === -1
        })
      }
    })

    return wDataArray
  }

}