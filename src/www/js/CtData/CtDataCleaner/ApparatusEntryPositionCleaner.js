import { CtDataCleaner } from './CtDataCleaner'

export class ApparatusEntryPositionCleaner extends CtDataCleaner {

  /**
   * Fixes a problem in apparatus entries where one of the end points of
   * the entry refers to a column with no printable token
   * @return {*}
   * @param ctData
   */
  getCleanCtData (ctData) {
    if (ctData['customApparatuses'] === undefined) {
      // not apparatuses to fix!
      return ctData
    }
    this.verbose && console.log(`Checking consistency in entry positions`)
    let errorsFound = false
    let errorsNotFixed = false
    let editionWitnessIndex = ctData['editionWitnessIndex']
    let editionWitnessTokens = ctData['witnesses'][editionWitnessIndex]['tokens']
    ctData['customApparatuses'] = ctData['customApparatuses'].map( (app) => {
      app.entries = app.entries.map((entry, entryIndex) => {
        if (entry.from === entry.to) {
          // nothing to do with entries to a single column
          return entry
        }
        // just report for now
        let fromToken = editionWitnessTokens[entry.from]
        let toToken = editionWitnessTokens[entry.to]

        if (fromToken === undefined) {
          errorsFound = true
          console.warn(`Apparatus ${app.type}: entry ${entryIndex} with 'from' index ${entry.from} refers to undefined token`)
        } else {
          if (fromToken.tokenType !== 'word' && fromToken.tokenType !== 'punctuation') {
            errorsFound = true
            // fix it by looking at the closest word or punctuation token before the toToken
            console.warn(`Apparatus ${app.type}: entry ${entryIndex} with 'from' index ${entry.from} refers to non-printable token (${fromToken.tokenType})`)
            let newIndex = this.findPrintableIndex(editionWitnessTokens, entry.from, entry.to, true)
            if (newIndex === -1) {
              console.warn(`Could not fix the problem`)
              errorsNotFixed = true
            } else {
              console.log(`Problem fixed, new 'from' index is ${newIndex}`)
              entry.from = newIndex
            }
          }
        }
        if (toToken === undefined) {
          errorsFound = true
          console.warn(`Apparatus ${app.type}: entry ${entryIndex} with 'to' index ${entry.to} refers to undefined token`)
        } else {
          if (toToken.tokenType !== 'word' && toToken.tokenType !== 'punctuation') {
            errorsFound = true
            // fix it by looking at the closest word or punctuation token before the toToken
            console.warn(`Apparatus ${app.type}: entry ${entryIndex} with 'to' index ${entry.to} refers to non-printable token (${toToken.tokenType})`)
            let newIndex = this.findPrintableIndex(editionWitnessTokens, entry.from, entry.to, false)
            if (newIndex === -1) {
              errorsNotFixed = true
              console.warn(`Could not fix the problem`)
            } else {
              console.log(`Problem fixed, new 'to' index is ${newIndex }`)
              entry.to = newIndex
            }
          }
        }
        return entry
      })
      return app
    })
    if (errorsFound) {
      if (errorsNotFixed) {
        console.warn(`Some errors could not be fixed`)
      } else {
        this.verbose && console.log(`...all good, all problems fixed`)
      }
    } else {
      this.verbose && console.log(`...all good`)
    }
    return ctData
  }

  /**
   *
   * @param tokens
   * @param {number}from
   * @param {number}to
   * @param {boolean}forward
   * @private
   */
  findPrintableIndex(tokens, from, to, forward) {

    let index = forward ? from : to
    let limit = forward ? to : from  // add/subtract 1 so that the limit itself is included in the loop



    while(index !== limit) {
      if (tokens[index].tokenType === 'word' || tokens[index].tokenType === 'punctuation') {
        return index
      }
      if (forward) {
        index++
        if (index > limit) {
          break
        }
      } else {
        index--
        if (index < limit) {
          break
        }
      }
    }
    return -1
  }
}