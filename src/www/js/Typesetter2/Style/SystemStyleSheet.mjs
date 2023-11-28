import { defaultLatinEditionStyle } from '../../defaults/EditionStyles/Latin.mjs'
import { latinLibertine } from '../../defaults/EditionStyles/LatinLibertine.mjs'

import { defaultArabicEditionStyle } from '../../defaults/EditionStyles/Arabic.mjs'
import { defaultHebrewEditionStyle } from '../../defaults/EditionStyles/Hebrew.mjs'

import { StyleSheet } from './StyleSheet.mjs'
import { arabicDeGruyter } from '../../defaults/EditionStyles/ArabicDeGruyter.mjs'
import { arabicDeGruyterAmiri} from '../../defaults/EditionStyles/ArabicDeGruyterAmiri.mjs'


let systemStyles = {
  la: {
    default: defaultLatinEditionStyle,
    libertine: latinLibertine
  },
  he: {
    default: defaultHebrewEditionStyle,
  },
  ar: {
    default: defaultArabicEditionStyle,
    degruyter: arabicDeGruyter,
    degruyteramiri: arabicDeGruyterAmiri
  }
}


export class SystemStyleSheet {

  static getStyleSheetsForLanguage(lang) {
    let styleSheetList
    switch(lang) {
      case 'ar':
        styleSheetList = systemStyles['ar']
        break

      case 'he':
        styleSheetList = systemStyles['he']
        break

      case 'la':
        styleSheetList = systemStyles['la']
        break

      default:
        console.error(`Unsupported edition style sheet language '${lang}'`)
    }
    return styleSheetList
  }

  /**
   *
   * @param {string}lang
   * @param {string}id
   */
  static getStyleSheet(lang, id) {
    let styleSheetList = this.getStyleSheetsForLanguage(lang)
    let ssDef = styleSheetList[id]
    if (ssDef === undefined) {
      console.warn(`Stylesheet '${id}' for lang '${lang}' not found, returning default`)
      return new StyleSheet(styleSheetList['default'])
    }
    return new StyleSheet(ssDef)
  }

}