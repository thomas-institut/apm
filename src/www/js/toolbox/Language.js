/**
 * A simple class to handle translated strings
 */
import { trimWhiteSpace } from './Util.mjs'

/**
 * A class to handle translated strings and simple templates
 *
 * The main method is getTranslation:
 *   getTranslation(key, data = {}, lang = '')
 *     key: a string that identifies the string/template. If no translation is
 *        available, the key itself will be parsed and returned
 *     data: an object containing the variables referred in the template
 *     lang: the desired language, or the current language is not language is given
 *
 *  E.g., getTranslation('Test: {{a}}', { a: 23})  returns 'Test: 23'
 *
 *  Templates can include object references
 *  e.g.:
 *    getTranslation('Test: {{car.color}}, {{car.model}}', {car: { color: 'blue', model:'BMW'}})
 *
 * Strings/templates are stored in an array of objects and are given when the class is instantiated
 *  [
 *    {  // a simple string
 *      key: 'Some label', // the key identifies the string, and it's returned if no translation is available
 *      es: 'Una etiqueta',
 *     ... other languages...
 *    },
 *    {
 *      key: 'Dashboard:PageTitle' // the key can also include some context in it, cf. with next item
 *      en: 'Dashboard' // in this case, normally an English translation will be needed
 *      es: 'Tablero'
 *    },
 *   {
 *      key: 'Dashboard:NavBar'
 *      en: 'Dashboard'
 *      es: 'Tablero de mandos'
 *    },
 *
 */
export class Language {
  /**
   *
   * @param { {}[]}templates  an array of template definitions and translations
   * @param {[]}supportedLanguages a list of supported languages
   * @param {string}defaultLang  the language the keys are in and thus the default language served if the key is not found
   * @param {string}lang  the language to serve if no language is given to getTranslation()
   */
  constructor (templates, supportedLanguages, defaultLang = 'en', lang = '') {
    this.defaultLang = defaultLang
    this.supportedLanguages = supportedLanguages
    this.lang = this.isLangSupported(lang) ? lang : this.defaultLang
    this.templates = templates
    this.debug = false
    this.debug && console.log(`Language initialized: '${this.lang}'`)
  }

  /**
   * Sets the language to return if no language is given to getTranslation
   * @param {string}lang
   */
  setLang(lang) {
    if (this.isLangSupported(lang)) {
      this.lang = lang
      this.debug && console.log(`Language set to '${lang}'`)
    } else {
      console.warn(`Attempting to set an invalid language: '${lang}', no changes made`)
    }
  }

  /**
   * Returns true is the given language is in the
   * @param {string}lang
   * @return {boolean}
   */
  isLangSupported(lang) {
    return this.supportedLanguages.indexOf(lang) !== -1
  }

  /**
   *
   * @param {string}key
   * @param {string}lang
   * @private
   */
  getRawTemplate(key, lang = '') {
    if (lang === '') {
      lang = this.lang
    } else {
      lang = this.supportedLanguages.indexOf(lang) !== -1 ? lang : this.lang
    }
    let obj = this.findDefForKey(key)
    if (obj === null) {
      console.warn(`Key not found: '${key}'`)
      return key
    }
    if (obj[lang] === undefined) {
      if (lang !== this.defaultLang) {
        console.warn(`String '${key}' not yet translated to lang '${lang}'`)
      }
      return key
    }
    return obj[lang]
  }

  /**
   * Gets and parses a template/string in the given language
   * @param {string}key
   * @param {{}}data
   * @param lang
   */
  getTranslation(key, data={}, lang = ''){
    let translatedTemplate = this.getRawTemplate(key, lang)
    let parts = this.parseTemplate(translatedTemplate)
    return parts.map( (part) => {
      if (part.type === 'text') {
        return part.text
      }
      // var
      let fields = trimWhiteSpace(part.text).split('.')
      if (fields.length === 0) {
        // no var given
        return ''
      }
      let object = data
      for (let i = 0; i < fields.length-1; i++) {
        if (object[fields[i]] !== undefined) {
          object = object[fields[i]]
        }
      }
      let lastField = fields[fields.length-1]
      return object[lastField] !== undefined ? object[lastField] :  this.getTranslation('undefined', {}, lang)
    }).join('')
  }

  /**
   *
   * @param {string}key
   * @private
   */
  findDefForKey(key) {
    let index = this.templates.map( o => o.key).indexOf(key)
    if (index === -1) {
      return null
    }
    return this.templates[index]
  }

  /**
   *
   * @param template
   * @return {*[]}
   * @private
   */
  parseTemplate(template) {
    let state = 0
    let parts = []
    let currentText = ''
    let currentVar = ''
    for (let i= 0; i < template.length; i++) {
      switch(state) {
        case 0: // accumulating text
          if (template.charAt(i) === '{') {
            state = 1
            break
          }
          currentText += template.charAt(i)
          break

        case 1: // after getting starting curly bracket
          if (template.charAt(i) === '{') {
            currentVar = ''
            state = 2
            break
          }
          currentText += '{'
          currentText += template.charAt(i)
          state = 0
          break

        case 2: // accumulating variable
          if (template.charAt(i) === '}') {
            state = 3
            break
          }
          currentVar += template.charAt(i)
          break

        case 3: // after getting the first closing curly bracket
          if (template.charAt(i) === '}') {
            // good variable!
            if (currentText !== '') {
              parts.push({ type: 'text', text: currentText})
              currentText = ''
            }
            parts.push( { type: 'var', text: currentVar})
            currentVar = ''
            state = 0
            break
          }
          // bad var!
          currentText += `{{${currentVar}}`
          state = 0
          break
      }
    }
    // END
    switch(state) {
      case 0:
        // nothing to do here
        break

      case 1:
        currentText += '{'
        break

      case 2:
        currentText += `{{${currentVar}`
        break

      case 3:
        currentText += `{{${currentVar}}`
        break
    }
    if (currentText !== '') {
      parts.push({ type: 'text', text: currentText})
    }
    return parts
  }
}