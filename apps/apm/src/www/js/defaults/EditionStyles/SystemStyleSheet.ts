// noinspection ES6PreferShortImport

import { defaultLatinEditionStyle } from './Latin.js'
import { latinLibertine } from './LatinLibertine.js'

import { defaultArabicEditionStyle } from './Arabic.js'
import { defaultHebrewEditionStyle } from './Hebrew.js'
import { hebrewPeetersJournal} from "./Hebrew-Peeters.js";

import {StyleSheet, StyleSheetDefinition} from '../../lib/Typesetter2/Style/StyleSheet.js';
import { arabicDeGruyter } from './ArabicDeGruyter.js'
import { arabicDeGruyterAmiri} from './ArabicDeGruyterAmiri.js'
import { arabicDeGruyterScheherazadeNew } from './ArabicDeGruyterScheherazadeNew.js'
import {latinPeetersJournal} from "./LatinPeetersJournal.js";


interface SystemStylesDatabase {
  la: SystemStyles,
  he: SystemStyles,
  ar: SystemStyles
  [key: string]: SystemStyles;
}

export interface SystemStyles {
  default: StyleSheetDefinition,
  [key: string]: StyleSheetDefinition
}


let systemStyles: SystemStylesDatabase = {
  la: {
    default: defaultLatinEditionStyle,
    libertine: latinLibertine,
    peetersJournal: latinPeetersJournal
  },
  he: {
    default: defaultHebrewEditionStyle,
    peetersjournal: hebrewPeetersJournal
  },
  ar: {
    default: defaultArabicEditionStyle,
    degruyter: arabicDeGruyter,
    degruyteramiri: arabicDeGruyterAmiri,
    degruyterscheherazade: arabicDeGruyterScheherazadeNew
  }
}


export class SystemStyleSheet {

  static getStyleSheetsForLanguage(lang: string): SystemStyles {
    if(systemStyles[lang] === undefined) {
      throw new Error(`Unsupported edition style sheet language '${lang}'`)
    }
    return systemStyles[lang]
  }

  /**
   *
   * @param {string}lang
   * @param {string}id
   */
  static getStyleSheet(lang: string, id: string): StyleSheet {
    let styleSheetList = this.getStyleSheetsForLanguage(lang)
    let ssDef = styleSheetList[id]
    if (ssDef === undefined) {
      console.warn(`Stylesheet '${id}' for lang '${lang}' not found, returning default`)
      return new StyleSheet(styleSheetList.default)
    }
    return new StyleSheet(ssDef)
  }

}