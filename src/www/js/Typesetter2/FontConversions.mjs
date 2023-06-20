import { ItemList } from './ItemList.mjs'
import { TextBox } from './TextBox.mjs'

export class FontConversions {

  /**
   * Applies the first matching font conversion definition from the given array to the given item
   * A font conversion definition is an object containing the format to match and the conversion required.
   * For example:
   *    {  from:  { fontFamily: 'FreeSerif', fontStyle: 'italic'}, to: {fontFamily: 'FancyFreeSerifFont'} }
   * @param {TypesetterItem}item
   * @param {[]}fontConversionDefinitions
   */
  static applyFontConversions(item, fontConversionDefinitions) {
    if (fontConversionDefinitions.length === 0) {
      // shortcut to avoid further comparisons
      return item
    }
    if (item instanceof ItemList) {
      item.setList( item.getList().map( (item) => { return this.applyFontConversions(item, fontConversionDefinitions)}))
      return item
    }
    if (item instanceof TextBox) {
      let match = this.findMatch(item, fontConversionDefinitions)
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
   * @private
   */
  static findMatch(textBoxItem, fontConversionDefinitions) {
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
        if (def[attr] === undefined) {
          continue
        }
        if (textBoxItem[attr] !== def[attr]) {
          matchFound = false
          break
        }
      }
      if (matchFound) {
        match = def
      }
    }
    return match
  }
}