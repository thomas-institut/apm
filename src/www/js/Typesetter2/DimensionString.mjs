import { trimWhiteSpace } from '../toolbox/Util.mjs'
import { Typesetter2 } from './Typesetter2.mjs'

export class DimensionString {

  /**
   * Parse
   * @param {any}someVariable
   * @return{[number, string]}
   */
  static parse(someVariable) {
    if (typeof someVariable === 'number') {
      return [someVariable, 'px']
    }
    let str = trimWhiteSpace(String(someVariable))
    // console.log(`String to parse: '${str}'`)
    let unit = 'px'
    let fields = str.split(' ')
    // console.log(`Fields`)
    // console.log(fields)
    if (fields.length > 1) {
      unit = fields[1]
    }
    let value = parseFloat(fields[0])
    if (typeof value !== 'number') {
      console.warn(`Invalid number: ${fields[0]}`)
      value = 0
    }
    return [ value, unit]
  }

  /**
   *
   * @param someVariable
   * @param emSize
   * @param spaceSize
   */
  static any2px(someVariable, emSize = 0, spaceSize = 0) {
    let [value, unit] = this.parse(someVariable)
    return this.valueUnit2px(value, unit, emSize, spaceSize )
  }

  /**
   *
   * @param {number}value
   * @param {string}unit
   * @param {number}emSize
   * @param {number}spaceSize
   * @return {number}
   */
  static valueUnit2px(value, unit, emSize = 0, spaceSize = 0 ) {
    switch (unit) {
      case 'px':
        return value

      case 'pt':
      case 'pts':
        return Typesetter2.pt2px(value)

      case 'cm':
      case 'cms':
        return Typesetter2.cm2px(value)

      case 'mm':
      case 'mms':
        return Typesetter2.cm2px(value/10)

      case 'em':
      case 'ems':
        return emSize*value

      case 'sp':
        return spaceSize*value

      default:
        console.warn(`Invalid unit '${unit}'`)
        return -1
    }
  }

}