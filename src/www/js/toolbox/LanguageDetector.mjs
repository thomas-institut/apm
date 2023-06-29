import { OptionsChecker } from '@thomas-inst/optionschecker'



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
    this.options = oc.getCleanOptions(options)
  }

  detectScript(text, ignorePunctuation = true) {
    let stringLength = text.length
    for(const [ lang, regex] of Object.entries(regexes)) {
      let matches = text.match(regex) || []
      let numMatches = matches.length
      if (ignorePunctuation) {
        // TODO: make this more accurate!
        const punctuationRegex = /[.,;\]\[()]/gi
        let punctuationMatches = text.match(punctuationRegex) || []
        numMatches += punctuationMatches.length
      }
      if (numMatches === stringLength) {
        return lang
      }
    }
    // no match, so it should latin script
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
    const scores = {}

    const punctuationRegex = /[.,;\]\[()-]/gi
    const latinScriptNumberRegex = /[0-9]/gi

    let punctuationMatches = text.match(punctuationRegex) || []
    let latinScriptNumberMatches =  text.match(latinScriptNumberRegex) || []

    for (const [lang, regex] of Object.entries(regexes)) {
      // detect occurrences of lang in a word
      let matches = text.match(regex) || []
      let numMatches = matches.length

      if (lang === 'la') {
        // do not include numbers in the total for latin
        numMatches -= latinScriptNumberMatches.length
      }

      if (lang === this.options.defaultLang) {
        numMatches = numMatches + punctuationMatches.length + latinScriptNumberMatches.length
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

    // not detected
    if (Object.keys(scores).length === 0)
      return this.options.defaultLang

    // pick lang with the highest percentage
    return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b)
  }
}
