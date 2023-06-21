import { ItemList } from './ItemList.mjs'
import { TextBox } from './TextBox.mjs'
import { LanguageDetector } from '../toolbox/LanguageDetector.mjs'

export class FontConversions {

  /**
   * Applies the first matching font conversion definition from the given array to the given item
   * A font conversion definition is an object containing the format to match and the conversion required.
   * For example:
   *    {  from:  { fontFamily: 'FreeSerif', fontStyle: 'italic'}, to: {fontFamily: 'FancyFreeSerifFont'} }
   * @param {TypesetterItem}item
   * @param {[]}fontConversionDefinitions
   * @param {string}defaultScript  Default script when script cannot be detected
   */
  static applyFontConversions(item, fontConversionDefinitions, defaultScript = 'la') {
    if (fontConversionDefinitions.length === 0) {
      // shortcut to avoid further comparisons
      return item
    }
    if (item instanceof ItemList) {
      item.setList( item.getList().map( (item) => { return this.applyFontConversions(item, fontConversionDefinitions)}))
      return item
    }
    if (item instanceof TextBox) {
      let match = this.findMatch(item, fontConversionDefinitions, defaultScript)
      if (match !== null) {
        Object.keys(match.to).forEach((prop) => {
          item[prop] = match.to[prop]
        })
        return item
      }
      return item
    }
    // any other type
    return item
  }

  /**
   *
   * @param {TextBox}textBoxItem
   * @param {[]}fontConversionDefinitions
   * @param defaultScript
   * @private
   */
  static findMatch(textBoxItem, fontConversionDefinitions, defaultScript) {
    let match = null
    for (let i=0; match === null && i < fontConversionDefinitions.length; i++) {
      let def = fontConversionDefinitions[i]
      if (def.from === undefined || def.to === undefined) {
        continue
      }
      let attributesToMatch = [ 'fontFamily', 'fontWeight', 'fontStyle']
      let matchFound = true
      for (let j = 0; j < attributesToMatch.length; j++) {
        let attr = attributesToMatch[j]
        if (def.from[attr] === undefined) {
          continue
        }
        if (textBoxItem[attr] !== def.from[attr]) {
          // console.log(`Mismatch`)
          matchFound = false
          break
        }
      }
      if (!matchFound) {
        match  = null
        continue
      }
      // style attributes match, check the script
      if (def.from.script !== undefined) {
        let ld = new LanguageDetector({defaultLang: defaultScript})
        let textScript = ld.detectScript(textBoxItem.getText())
        if (textScript === def.from.script) {
          match = def
        } else {
          match = null
        }
      } else {
        match = def
      }

    }
    return match
  }
}