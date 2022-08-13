import { MainText } from './MainText'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Typesetter2 } from '../Typesetter2/Typesetter2.mjs'
import { TextBoxMeasurer } from '../Typesetter2/TextBoxMeasurer/TextBoxMeasurer.mjs'
import { Box } from '../Typesetter2/Box.mjs'
import { ItemList } from '../Typesetter2/ItemList.mjs'
import * as TypesetterItemDirection from '../Typesetter2/TypesetterItemDirection.mjs'
import * as MetadataKey from '../Typesetter2/MetadataKey.mjs'
import * as ListType from '../Typesetter2/ListType.mjs'
import { Glue } from '../Typesetter2/Glue.mjs'
import * as MainTextTokenType from './MainTextTokenType'
import { TextBox } from '../Typesetter2/TextBox.mjs'
import { Typesetter2TokenRenderer } from '../FmtText/Renderer/Typesetter2TokenRenderer'
import { Penalty } from '../Typesetter2/Penalty.mjs'
import { LanguageDetector } from '../toolbox/LanguageDetector.mjs'
import { getTextDirectionForLang, isRtl } from '../toolbox/Util.mjs'
import { FmtTextFactory} from '../FmtText/FmtTextFactory'
import { ObjectFactory } from '../Typesetter2/ObjectFactory.mjs'
import { Edition } from './Edition'
import { pushArray } from '../toolbox/ArrayUtil.mjs'

import { defaultLatinEditionStyle} from '../defaults/EditionStyles/Latin.mjs'
import { defaultArabicEditionStyle} from '../defaults/EditionStyles/Arabic.mjs'
import {defaultHebrewEditionStyle} from '../defaults/EditionStyles/Hebrew.mjs'
import {defaultStyleSheet} from '../Typesetter2/Style/DefaultStyleSheet.mjs'
import { StyleSheet } from '../Typesetter2/Style/StyleSheet'
import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'
import { Typesetter2StyleSheetTokenRenderer } from '../FmtText/Renderer/Typesetter2StyleSheetTokenRenderer.mjs'


let defaultEditionStyles = {
  la: defaultLatinEditionStyle,
  ar: defaultArabicEditionStyle,
  he: defaultHebrewEditionStyle
}

export class EditionTypesetting {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'EditionTypesetting',
      optionsDefinition: {
        edition: { type: 'object', objectClass: Edition},
        editionStyleName: { type: 'string', default: ''},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        debug: { type: 'boolean',  default: false}
      }
    })
    this.options = oc.getCleanOptions(options)
    this.debug = this.options.debug

    this.edition = this.options.edition
    this.sigla = this.edition.witnesses.map ( (w) => { return w.siglum})
    if (this.options.editionStyleName === '') {
      this.options.editionStyleName = this.edition.lang
    }

    this.textDirection = getTextDirectionForLang(this.edition.lang)
    this.textBoxMeasurer = this.options.textBoxMeasurer
    this.ss = new StyleSheet(defaultStyleSheet, this.textBoxMeasurer)
    this.editionStyle = defaultEditionStyles[this.options.editionStyleName]
    this.ss.merge(this.editionStyle.formattingStyles)
    this.debug && console.log(`Stylesheet`)
    this.debug && console.log(this.ss.getStyleDefinitions())
    this.tokenRenderer = new Typesetter2StyleSheetTokenRenderer({
      styleSheet: this.ss.getStyleDefinitions(),
      textBoxMeasurer: this.textBoxMeasurer
    })
    this.isSetup = true
  }

  setup() {
    this.isSetup = true
    return resolvedPromise(true)
  }

  /**
   *
   * @return {Promise<ItemList>}
   */
  generateListToTypesetFromMainText() {

    return new Promise( async (resolve, reject) => {
      if (!this.isSetup) {
        reject('EditionTypesetting not set up yet')
      }
      let edition = this.options.edition
      let textDirection = this.textDirection
      this.languageDetector = new LanguageDetector({ defaultLang: edition.lang})
      let verticalItems = []
      let mainTextParagraphs = MainText.getParagraphs(edition.mainText)
      for (let mainTextParagraphIndex = 0; mainTextParagraphIndex < mainTextParagraphs.length; mainTextParagraphIndex++) {
        let mainTextParagraph = mainTextParagraphs[mainTextParagraphIndex]
        let paragraphToTypeset = new ItemList(TypesetterItemDirection.HORIZONTAL)
        let paragraphStyle = mainTextParagraph.type
        // this.debug && console.log(`Main text paragraph style: '${paragraphStyle}'`)
        if (!this.ss.styleExists(paragraphStyle)) {
          this.debug && console.log(`Paragraph style is not defined, defaulting to 'normal'`)
          paragraphStyle = 'normal'
        }
        let paragraphStyleDef = await this.ss.getParagraphStyle(paragraphStyle)
        this.debug && console.log(`Paragraph style ${paragraphStyle}`)
        this.debug && console.log(paragraphStyleDef)

        if (paragraphStyleDef.spaceBefore !== 0) {
          verticalItems.push( (new Glue(TypesetterItemDirection.VERTICAL)).setHeight(paragraphStyleDef.spaceBefore))
        }
        if (paragraphStyleDef.indent !== 0 ) {
          paragraphToTypeset.pushItem(this.__createIndentBox(paragraphStyleDef, textDirection))
        }
        if (paragraphStyleDef.align === 'center') {
          paragraphToTypeset.pushItem( (new Box().setWidth(0)))
          paragraphToTypeset.pushItem(Glue.createLineFillerGlue().setTextDirection(textDirection))
        }
        for (let tokenIndex = 0; tokenIndex < mainTextParagraph.tokens.length; tokenIndex++) {
          let mainTextToken = mainTextParagraph.tokens[tokenIndex]
          switch(mainTextToken.type) {
            case MainTextTokenType.GLUE:
              let glue = await this.__createNormalSpaceGlue(paragraphStyle)
              glue.addMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX, mainTextToken.originalIndex)
              paragraphToTypeset.pushItem(glue)
              break

            case MainTextTokenType.TEXT:
              let textItems = await this.tokenRenderer.renderWithStyle(mainTextToken.fmtText, edition.lang, paragraphStyle)
              if (textItems.length > 0) {
                // tag the first item with the original index
                textItems[0].addMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX, mainTextToken.originalIndex)
                // detect text direction for text boxes
                textItems = textItems.map ( (item) => {
                  if (item instanceof TextBox) {
                    return this.__detectAndSetTextDirection(item)
                  }
                  return item
                })
                paragraphToTypeset.pushItemArray(textItems)
              }
              break

          }
        }


        paragraphToTypeset.pushItem(Glue.createLineFillerGlue().setTextDirection(textDirection))
        paragraphToTypeset.pushItem(Penalty.createForcedBreakPenalty())
        verticalItems.push(paragraphToTypeset)
        if (paragraphStyleDef.spaceAfter !== 0) {
          verticalItems.push( (new Glue(TypesetterItemDirection.VERTICAL)).setHeight(paragraphStyleDef.spaceAfter))
        }
      }
      let verticalListToTypeset = new ItemList(TypesetterItemDirection.VERTICAL)
      verticalListToTypeset.setList(verticalItems)

      resolve(verticalListToTypeset)

    })
  }

  resetExtractedMetadataInfo() {
    this.extractedMetadataInfo = undefined
  }

  /**
   *
   * @param {ItemList}typesetMainTextVerticalList
   * @param apparatus
   * @return {Promise<ItemList>}
   */
  generateApparatusVerticalListToTypeset(typesetMainTextVerticalList, apparatus) {
    return new Promise( async (resolve) => {
      // TODO: restrict line numbers to output
      this.debug && console.log(`Getting apparatus vertical list to typeset`)
      this.debug && console.log(apparatus)
      let textDirection = getTextDirectionForLang(this.edition.lang)
      let outputList = new ItemList(TypesetterItemDirection.HORIZONTAL)
      if (apparatus.entries.length === 0) {
        resolve(outputList)
        return
      }
      if (this.extractedMetadataInfo === undefined) {
        this.extractedMetadataInfo = this.__extractLineInfoFromMetadata(typesetMainTextVerticalList)
        this.debug && console.log(`Line info from metadata`)
        this.debug && console.log(this.extractedMetadataInfo)
        this.mainTextIndices = this.extractedMetadataInfo.map ( (info) => { return info.mainTextIndex})
      }
      if (this.extractedMetadataInfo.length === 0) {
        this.debug && console.log(`No line info in metadata, nothing to typeset for apparatus ${apparatus.type}`)
        resolve(outputList)
        return
      }

      this.debug && console.log(`Apparatus '${apparatus.type}' with ${apparatus.entries.length} entries in total.`)
      let minMainTextIndex = this.extractedMetadataInfo[0].mainTextIndex
      let maxMainTextIndex = this.extractedMetadataInfo[this.extractedMetadataInfo.length-1].mainTextIndex
      this.debug && console.log(` - MainText from index ${minMainTextIndex} to index ${maxMainTextIndex}`)

      let appEntries = apparatus.entries.filter( (entry) => {
        return (entry.from >= minMainTextIndex && entry.from <= maxMainTextIndex)
      }).filter( (entry) => {
        let subEntries = entry.subEntries
        let thereAreEnabledSubEntries = false
        for (let subEntryIndex = 0; thereAreEnabledSubEntries === false && subEntryIndex < subEntries.length; subEntryIndex++) {
          if (subEntries[subEntryIndex].enabled) {
            thereAreEnabledSubEntries = true
          }
        }
        return thereAreEnabledSubEntries
      })
      this.debug && console.log(` - ${appEntries.length} apparatus entries to typeset`)

      // get lines for each entry
      let entriesWithLineInfo = appEntries.map ( (entry) => {
        let lineFrom = this.__getLineForMainTextIndex(entry.from)
        let lineTo = this.__getLineForMainTextIndex(entry.to)
        return {
          key: this.__getRangeUniqueString(lineFrom, lineTo),
          lineFrom: lineFrom,
          lineTo: lineTo,
          entry: entry
        }
      })
      let lineRanges = {}
      entriesWithLineInfo.forEach( (entryWithLineInfo) => {
        if (lineRanges[entryWithLineInfo.key] === undefined ) {
          lineRanges[entryWithLineInfo.key] = {
            key: entryWithLineInfo.key,
            lineFrom: entryWithLineInfo.lineFrom,
            lineTo: entryWithLineInfo.lineTo,
            entries: []
          }
        }
        lineRanges[entryWithLineInfo.key].entries.push(entryWithLineInfo.entry)
      })

      this.debug && console.log(`Line Ranges`)
      this.debug && console.log(lineRanges)

      let lineRangesKeys = Object.keys(lineRanges)
      lineRangesKeys.sort()
      for (let lineRangeKeyIndex = 0; lineRangeKeyIndex < lineRangesKeys.length; lineRangeKeyIndex++) {
        let lineRange = lineRanges[lineRangesKeys[lineRangeKeyIndex]]
        outputList.pushItemArray(await this._getTsItemsFromStr(this.__getLineStringFromRange(lineRange.lineFrom, lineRange.lineTo), 'apparatus apparatusLineNumbers', textDirection))
        outputList.pushItem((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(textDirection))
        for (let entryIndex = 0; entryIndex<lineRange.entries.length; entryIndex++) {
          let entry = lineRange.entries[entryIndex]
          outputList.pushItemArray(await this._getTsItemsFromStr(entry.lemmaText, 'apparatus'))
          outputList.pushItemArray(await this.tokenRenderer.renderWithStyle(this._getSeparatorFmtText(entry), this.edition.lang, 'apparatus'))
          outputList.pushItem((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(textDirection))
          // typeset sub entries
          for (let subEntryIndex = 0; subEntryIndex < entry.subEntries.length; subEntryIndex++) {
            let subEntry = entry.subEntries[subEntryIndex]
            outputList.pushItemArray(await this._getSubEntryTsItems(subEntry))
            if (subEntryIndex !== entry.subEntries.length -1) {
              outputList.pushItem((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(textDirection))
            }
          }
          if (entryIndex !== lineRange.entries.length -1) {
            outputList.pushItem((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(textDirection))
            outputList.pushItemArray(await this._getTsItemsFromStr('|', 'apparatus', textDirection))
            outputList.pushItem((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(textDirection))
          }
        }
        outputList.pushItem((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(textDirection))
        outputList.pushItemArray(await this._getTsItemsFromStr('||', 'apparatus', textDirection))
        outputList.pushItem((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(textDirection))
      }

      outputList.pushItem(Glue.createLineFillerGlue().setTextDirection(textDirection))
      outputList.pushItem(Penalty.createForcedBreakPenalty())
      this.debug && console.log(` => Output`)
      this.debug && console.log(outputList)
      resolve(outputList)
    })
  }

  _getSeparatorFmtText(entry) {
    switch(entry.separator) {
      case 'colon':
        return FmtTextFactory.fromAnything(':')

      case '':
        return FmtTextFactory.fromString(']')

      default:
        return FmtTextFactory.fromAnything(entry.separator)
    }
  }

  _getSubEntryTsItems(subEntry) {
    return new Promise( async (resolve) => {
      let items = []
      switch(subEntry.type) {
        case 'variant':
          pushArray(items, await this.tokenRenderer.renderWithStyle(subEntry.fmtText, this.edition.lang, 'apparatus'))
          items.push(await this.__createNormalSpaceGlue('apparatus'))
          let siglaTextBox = await this.ss.apply((new TextBox()).setText(this.__getSiglaString(subEntry.witnessData)), 'apparatus')
          items.push(siglaTextBox)
          break

        case 'omission':
        case 'addition':
          let keyword = this.editionStyle.strings[subEntry.type]
          let keywordTextBox = await this.ss.apply((new TextBox()).setText(keyword), 'apparatus apparatusKeyword')
          items.push(keywordTextBox)
          items.push(await this.__createNormalSpaceGlue('apparatus'))
          if (subEntry.type === 'addition') {
            pushArray(items, await this.tokenRenderer.renderWithStyle(subEntry.fmtText, this.edition.lang, 'apparatus'))
            items.push(await this.__createNormalSpaceGlue('apparatus'))
          }
          let siglaTextBox2 = await this.ss.apply((new TextBox()).setText(this.__getSiglaString(subEntry.witnessData)), 'apparatus')
          items.push(siglaTextBox2)
          break

        case 'fullCustom': {
          pushArray(items, await this.tokenRenderer.renderWithStyle(subEntry.fmtText, this.edition.lang, 'apparatus'))
          break
        }
      }
      resolve(items)
    })

  }

  __getSiglaString(witnessData) {
    // TODO: implement sigla groups
    return witnessData.map( (wd) => {return this.sigla[wd.witnessIndex]}).join('')
  }

  __getLineStringFromRange(from, to) {
    if (from === to) {
      return String(from)
    }
    return `${from}-${to}`
  }

  /**
   *
   * @param {string}from
   * @param {string}to
   * @return {string}
   * @private
   */
  __getRangeUniqueString(from, to) {
    return `R_${String(from).padStart(4,'0')}_${String(to).padStart(4,'0')}`
  }

  /**
   *
   * @param {number}mainTextIndex
   * @private
   */
  __getLineForMainTextIndex(mainTextIndex) {
    if (this.extractedMetadataInfo === undefined) {
      return -1
    }
    let infoIndex = this.mainTextIndices.indexOf(mainTextIndex)
    if (infoIndex === -1) {
      return -1
    }
    return this.extractedMetadataInfo[infoIndex].lineNumber
  }

  /**
   * Returns an array of objects containing line information for each main text token
   * that appears in the given typeset main text
   * @param {ItemList}typesetMainTextVerticalList
   * @private
   */
  __extractLineInfoFromMetadata(typesetMainTextVerticalList) {
    let outputInfo = []
    typesetMainTextVerticalList.getList().forEach( (horizontalList) => {
      if (!horizontalList.hasMetadata(MetadataKey.LIST_TYPE)) {
        return
      }
      if (horizontalList.getMetadata(MetadataKey.LIST_TYPE) !==  ListType.LINE) {
        return
      }
      if (!horizontalList.hasMetadata(MetadataKey.LINE_NUMBER)) {
        this.debug && console.log(`Found line without line number info`)
        return
      }
      let lineNumber = horizontalList.getMetadata(MetadataKey.LINE_NUMBER)
      if (horizontalList instanceof ItemList) {
        horizontalList.getList().forEach( (item) => {
          if (!item.hasMetadata(MetadataKey.MERGED_ITEM || item.getMetadata(MetadataKey.MERGED_ITEM) === false)) {
            // normal, single item
            let info = this.__getInfoFromItem(item, lineNumber)
            if (info !== undefined) {
              outputInfo.push(info)
            }
          } else {
            // merged item
            if (!item.hasMetadata(MetadataKey.SOURCE_ITEMS_EXPORT)) {
              // no data from source items, warn and return
              console.warn(`Found merged item without source items info`)
              console.warn(item)
              return
            }
            item.getMetadata(MetadataKey.SOURCE_ITEMS_EXPORT).forEach( (sourceItemExport) => {
              let sourceItem = ObjectFactory.fromObject(sourceItemExport)
              let info = this.__getInfoFromItem(sourceItem, lineNumber)
              if (info !== undefined) {
                outputInfo.push(info)
              }
            })
          }

        })
      }
    })
    // sort the array by mainTextIndex
    outputInfo.sort( (a, b) => { return a.mainTextIndex - b.mainTextIndex})

    return outputInfo
  }

  /**
   *
   * @param {TypesetterItem}item
   * @param {number}lineNumber
   * @private
   */
  __getInfoFromItem(item, lineNumber) {
    let info = {
      lineNumber: lineNumber,
      occurrenceInLine: 1,
      totalOccurrencesInLine: 1,
      text: ''
    }
    if (item instanceof TextBox) {
      info.text = item.getText()
    }
    if (!item.hasMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX)) {
      return undefined
    }
    info.mainTextIndex = item.getMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX)
    if (item.hasMetadata(MetadataKey.TOKEN_OCCURRENCE_IN_LINE)) {
      info.occurrenceInLine = item.getMetadata(MetadataKey.TOKEN_OCCURRENCE_IN_LINE)
    }

    if (item.hasMetadata(MetadataKey.TOKEN_TOTAL_OCCURRENCES_IN_LINE)) {
      info.totalOccurrencesInLine = item.getMetadata(MetadataKey.TOKEN_TOTAL_OCCURRENCES_IN_LINE)
    }
    // some sanity checks
    if (info.occurrenceInLine > info.totalOccurrencesInLine) {
      console.warn(`Inconsistent information found in metadata`)
      console.warn(info)
      return undefined
    }
    return info
  }


  /**
   *
   * @return {Box}
   * @private
   */
  __createIndentBox(styleDef, textDirection) {
    return (new Box()).setWidth(styleDef.indent).setTextDirection(textDirection)
  }

   __createNormalSpaceGlue(style) {
    return new Promise( (resolve) => {
      this.ss.apply( new Glue(), style).then( (glue) => {
        resolve(glue)
      })
    })
  }

  /**
   *
   * @param {TextBox}textBox
   * @private
   */
  __detectAndSetTextDirection(textBox) {
    if (textBox.getTextDirection() !== '') {
      // do not change if text direction is already set
      return textBox
    }
    let detectedLang = this.languageDetector.detectLang(textBox.getText())
    if (isRtl(detectedLang)) {
      return textBox.setRightToLeft()
    } else {
      return textBox.setLeftToRight()
    }
  }

  _getTsItemsFromStr(someString, style = 'normal', forceTextDirection = '') {
    return new Promise( async (resolve) => {
      let fmtText = FmtTextFactory.fromString(someString)

      let items = await this.tokenRenderer.renderWithStyle(fmtText, this.edition.lang, style)
      if (forceTextDirection !== '') {
        items.forEach( (item) => {
          item.setTextDirection(forceTextDirection)
        })
      }
      resolve(items)
    })

  }

  /**
   *
   * @param style
   * @return {TextBox}
   * @private
   */
  _createTextBoxWithStyle(style) {
    let styleDef = defaultEditionStyles[this.options.editionStyle].formattingStyles[style]
    if (styleDef === undefined) {
      console.warn(`Style '${style}' is undefined`)
    }

    return (new TextBox()).setFontFamily(styleDef.fontFamily)
      .setFontSize(styleDef.fontSize)
      .setFontWeight(styleDef.fontWeight)
      .setFontStyle(styleDef.fontStyle)
  }





}