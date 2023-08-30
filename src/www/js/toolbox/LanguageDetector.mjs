import { OptionsChecker } from '@thomas-inst/optionschecker'
import { isNumeric, isWhiteSpace } from './Util.mjs'

const punctuationRegex = /[.,;\]\[()]/gi
const latinScriptNumberRegex = /[0-9]/gi

// Based on http://www.unicode.org/Public/UNIDATA/extracted/DerivedBidiClass.txt
const ltrRegex = /[\u0041-\u005a\u0061-\u007a\u00aa\u00b5\u00ba\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02b8\u02bb-\u02c1]/gi

const regexes = {
  'la': /[\u0000-\u007F]/gi,
  'el':/[\u0370-\u03ff\u1f00-\u1fff]/gi,
  // 'zh': /[\u3000\u3400-\u4DBF\u4E00-\u9FFF]/gi,
  // 'hi': /[\u0900-\u097F]/gi,
  'ar': /[\u0600-\u06ff]/gi,
  // 'bn': /[\u0995-\u09B9\u09CE\u09DC-\u09DF\u0985-\u0994\u09BE-\u09CC\u09D7\u09BC]/gi,
  'he': /[\u0590-\u05FF]/gi,
}

export class LanguageDetector {


  constructor (options = {}) {

    let optionsSpec = {
      defaultLang: {
        // language to use for generic punctuation and for numbers
        type: 'string',
        default: 'la'
      }
    }

    let oc = new OptionsChecker({ optionsDefinition: optionsSpec, context: 'LanguageDetector'})
    let cleanOptions = oc.getCleanOptions(options)
    this.defaultLang = cleanOptions.defaultLang
  }

  setDefaultLang(lang) {
    this.defaultLang = lang
  }

  /**
   * Detects the intrinsic text direction of the given string
   * If the string is direction-neutral, e.g., punctuation or latin numbers,
   * returns '', otherwise  returns 'rtl', 'ltr' or 'en'
   * @param word
   */
  detectTextDirection(word) {
    let debug = false

    // if (word.charAt(0) === '(' || word.charAt(0) === ')') {
    //   debug = true
    // }
    debug && console.log(`Detecting text direction for '${word}'`)
    // 1. Is it whitespace?
    if (isWhiteSpace(word)) {
      return ''
    }
    // 2. Is it all (common) neutral characters?
    // TODO: make a better list of neutrals
    const neutralCharacters = [ '[', ']', '(', ')', '{', '}', '«', '»', '.', ',', ';', ':', '"', ' ']
    let allNeutrals = true
    for(let i = 0; i < word.length; i++) {
      if (neutralCharacters.indexOf(word.charAt(i)) === -1) {
        allNeutrals = false
        break
      }
    }
    if (allNeutrals) {
      return ''
    }

    // 2. Is it a numeric string possibly surrounded by brackets or other neutrals?
    let firstNonStartingNeutral = -1
    const startingNeutrals = [ '[', ']', '(', ')', '{', '}', '«', '»', '"', ' ']
    for(let i = 0; i < word.length; i++) {
      if (startingNeutrals.indexOf(word.charAt(i)) === -1) {
        firstNonStartingNeutral = i
        break
      }
    }
    if (firstNonStartingNeutral === -1) {
      // this should not happen because starting neutrals is a subset of neutralCharacters
      console.warn(`Neutral string found while testing for a numeric one!`)
      // but, it's still a neutral, so it's not an error
      return ''
    }

    let lastNonNeutral = -1
    for(let i= word.length -1; i >= 0; i--) {
      if (neutralCharacters.indexOf(word.charAt(i)) === -1) {
        lastNonNeutral = i
        break
      }
    }
    if (lastNonNeutral === -1) {
      // again, this should not happen
      console.warn(`Neutral string found while testing for a numeric one!`)
      // but, it's still a neutral, so it's not an error
      return ''
    }
    let stringToTest = word.substring(firstNonStartingNeutral, lastNonNeutral+1)
    // console.log(`Testing for numeric string: '${stringToTest}'`)
    if (isNumeric(stringToTest)) {
      return 'en'
    }

    debug && console.log(` Not a number and not all neutrals, detecting language for non-neutral substring '${stringToTest}'´`)

    // 3. Is it Arabic or Hebrew?
    let lang = this.detectLang(stringToTest)

    debug && console.log(` ...language is '${lang}'`)
    if (lang === 'ar' || lang === 'he') {
      return 'rtl'
    }

    // 4. It should be LTR then
    return 'ltr'
  }

  getIntrinsicDirectionForChar(char) {
    // only deal with first character in the string
    let ch = char.charAt(0)

  }

  detectScript(text, ignorePunctuation = true) {
    let stringLength = text.length
    for(const [ lang, regex] of Object.entries(regexes)) {
      let matches = text.match(regex) || []
      let numMatches = matches.length
      if (ignorePunctuation) {
        let punctuationMatches = text.match(punctuationRegex) || []
        numMatches += punctuationMatches.length
      }
      if (numMatches === stringLength) {
        return lang
      }
    }
    // no match, so it should be latin script
    return 'la'
  }

  /**
   * Tries to detect the language of the given string by analyzing its characters
   * In non-strict mode, the string is considered to be of a given language
   * if the majority of its characters are in the language's character range
   *
   * @param {string}text
   * @return {string}
   */
  detectLang(text) {
    let debug = false

    if (text.charAt(0) === '(' || text.charAt(0) === ')') {
      debug = true
    }

    const scores = {}



    let punctuationMatches = text.match(punctuationRegex) || []
    let latinScriptNumberMatches =  text.match(latinScriptNumberRegex) || []

    for (const [lang, regex] of Object.entries(regexes)) {
      // detect occurrences of lang in a word
      let matches = text.match(regex) || []
      let numMatches = matches.length
      debug && console.log(`Num matches for '${text}', lang '${lang}' = ${numMatches}`)

      if (lang === 'la') {
        // do not include numbers in the total for latin
        numMatches -= latinScriptNumberMatches.length
      }

      if (lang === this.defaultLang) {
        numMatches = numMatches + punctuationMatches.length + latinScriptNumberMatches.length
        debug && console.log(`Adjusted default lang num matches for '${text}', lang '${lang}' = ${numMatches}`)
      }

      let score =numMatches / text.length

      if (score) {
        // high percentage, return result
        if (score > 0.85) {
          return lang
        }
        scores[lang] = score
      }
    }

    debug && console.log(`Scores:`)
    debug && console.log(scores)
    // not detected
    if (Object.keys(scores).length === 0)
      return this.defaultLang

    // pick lang with the highest percentage
    return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b)
  }
}
