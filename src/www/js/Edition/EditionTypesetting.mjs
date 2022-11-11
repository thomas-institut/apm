import { MainText } from './MainText.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TextBoxMeasurer } from '../Typesetter2/TextBoxMeasurer/TextBoxMeasurer.mjs'
import { Box } from '../Typesetter2/Box.mjs'
import { ItemList } from '../Typesetter2/ItemList.mjs'
import * as TypesetterItemDirection from '../Typesetter2/TypesetterItemDirection.mjs'
import * as MetadataKey from '../Typesetter2/MetadataKey.mjs'
import * as ListType from '../Typesetter2/ListType.mjs'
import { Glue } from '../Typesetter2/Glue.mjs'
import * as MainTextTokenType from './MainTextTokenType.mjs'
import { TextBox } from '../Typesetter2/TextBox.mjs'
import { Penalty } from '../Typesetter2/Penalty.mjs'
import { LanguageDetector } from '../toolbox/LanguageDetector.mjs'
import { getTextDirectionForLang, isRtl, removeExtraWhiteSpace } from '../toolbox/Util.mjs'
import { FmtTextFactory} from '../FmtText/FmtTextFactory.mjs'
import { ObjectFactory } from '../Typesetter2/ObjectFactory.mjs'
import { pushArray } from '../toolbox/ArrayUtil.mjs'

import { defaultLatinEditionStyle} from '../defaults/EditionStyles/Latin.mjs'
import { defaultArabicEditionStyle} from '../defaults/EditionStyles/Arabic.mjs'
import {defaultHebrewEditionStyle} from '../defaults/EditionStyles/Hebrew.mjs'
import {defaultStyleSheet} from '../Typesetter2/Style/DefaultStyleSheet.mjs'
import { StyleSheet } from '../Typesetter2/Style/StyleSheet.mjs'
import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'
import { Typesetter2StyleSheetTokenRenderer } from '../FmtText/Renderer/Typesetter2StyleSheetTokenRenderer.mjs'
import { ApparatusUtil } from './ApparatusUtil.mjs'
import { NumeralStyles } from '../toolbox/NumeralStyles.mjs'
import { TextBoxFactory } from '../Typesetter2/TextBoxFactory.mjs'
import { SiglaGroup } from './SiglaGroup.mjs'
import { ApparatusEntry } from './ApparatusEntry.mjs'
import { FmtText } from '../FmtText/FmtText.mjs'
import { BasicProfiler } from '../toolbox/BasicProfiler.mjs'

let defaultEditionStyles = {
  la: defaultLatinEditionStyle,
  ar: defaultArabicEditionStyle,
  he: defaultHebrewEditionStyle
}

const defaultLemmaSeparator = ']'
const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)

export const MAX_LINE_COUNT = 10000


export class EditionTypesetting {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'EditionTypesetting',
      optionsDefinition: {
        edition: { type: 'object'},
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

    this.siglaGroups = this.edition.siglaGroups.map( (sg) => { return SiglaGroup.fromObject(sg)})

    this.textDirection = getTextDirectionForLang(this.edition.lang)
    this.textBoxMeasurer = this.options.textBoxMeasurer
    this.ss = new StyleSheet(defaultStyleSheet, this.textBoxMeasurer)
    this.editionStyle = defaultEditionStyles[this.options.editionStyleName]
    this.ss.merge(this.editionStyle.formattingStyles)
    // this.debug && console.log(`Stylesheet`)
    // this.debug && console.log(this.ss.getStyleDefinitions())
    this.tokenRenderer = new Typesetter2StyleSheetTokenRenderer({
      styleSheet: this.ss.getStyleDefinitions(),
      textBoxMeasurer: this.textBoxMeasurer
    })
    this.isSetup = true
    this.languageDetector = new LanguageDetector({ defaultLang: this.options.edition.lang})
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
      // this.debug && console.log(`Edition language is '${this.edition.lang}',  ${textDirection}`)

      let verticalItems = []
      let mainTextParagraphs = MainText.getParagraphs(edition.mainText)
      for (let mainTextParagraphIndex = 0; mainTextParagraphIndex < mainTextParagraphs.length; mainTextParagraphIndex++) {
        let mainTextParagraph = mainTextParagraphs[mainTextParagraphIndex]
        let paragraphToTypeset = new ItemList(TypesetterItemDirection.HORIZONTAL)
        paragraphToTypeset.setTextDirection(textDirection)
        let paragraphStyle = mainTextParagraph.type
        // this.debug && console.log(`Main text paragraph style: '${paragraphStyle}'`)
        if (!this.ss.styleExists(paragraphStyle)) {
          this.debug && console.log(`Paragraph style is not defined, defaulting to 'normal'`)
          paragraphStyle = 'normal'
        }
        let paragraphStyleDef = await this.ss.getParagraphStyle(paragraphStyle)
        // this.debug && console.log(`Paragraph style ${paragraphStyle}`)
        // this.debug && console.log(paragraphStyleDef)

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
              let textItems = await this.tokenRenderer.renderWithStyle(mainTextToken.fmtText, paragraphStyle)
              if (textItems.length > 0) {
                // tag the first item with the original index
                textItems[0].addMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX, mainTextToken.originalIndex)
                // detect text direction for text boxes
                textItems = textItems.map ( (item) => {
                  if (item instanceof TextBox) {
                    return this.__detectAndSetTextBoxTextDirection(item)
                  }
                  return item
                })
                // this.debug && console.log(`Pushing items`)
                // this.debug && console.log(textItems)
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
   * @param {number}firstLine
   * @param {number}lastLine
   * @return {Promise<ItemList>}
   */
  generateApparatusVerticalListToTypeset(typesetMainTextVerticalList, apparatus, firstLine = 1, lastLine= MAX_LINE_COUNT) {
    return new Promise( async (resolve) => {
      // this.debug && console.log(`Getting vertical list for apparatus '${apparatus.type}, line ${firstLine} to ${lastLine === MAX_LINE_COUNT ? 'end' : lastLine}`)

      let textDirection = getTextDirectionForLang(this.edition.lang)
      let outputList = new ItemList(TypesetterItemDirection.HORIZONTAL)
      outputList.setTextDirection(textDirection)
      if (apparatus.entries.length === 0) {
        resolve(outputList)
        return
      }
      // let profiler = new BasicProfiler('ApparatusTypesetting')
      // profiler.start()
      if (this.extractedMetadataInfo === undefined) {

        // Generate apparatus information for this and future apparatus typesetting requests
        this.extractedMetadataInfo = this.__extractLineInfoFromMetadata(typesetMainTextVerticalList)
        // this.debug && console.log(`Line info from metadata`)
        // this.debug && console.log(this.extractedMetadataInfo)
        this.mainTextIndices = this.extractedMetadataInfo.map((info) => { return info.mainTextIndex})
        // reset apparatus data
        this.appEntries = {}
        this.lineRanges = {}
        // profiler.lap('extracted metadata info')
      }


      if (this.extractedMetadataInfo.length === 0) {
        this.debug && console.log(`No line info in metadata, nothing to typeset for apparatus ${apparatus.type}`)
        resolve(outputList)
        return
      }

      if (this.appEntries[apparatus.type] === undefined) {
        // this.debug && console.log(`Apparatus '${apparatus.type}' with ${apparatus.entries.length} entries in total.`)
        let minMainTextIndex = this.extractedMetadataInfo[0].mainTextIndex
        let maxMainTextIndex = this.extractedMetadataInfo[this.extractedMetadataInfo.length - 1].mainTextIndex
        // this.debug && console.log(` - MainText from index ${minMainTextIndex} to index ${maxMainTextIndex}`)

        this.appEntries[apparatus.type] = apparatus.entries.filter( (entry) => {
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
        // this.debug && console.log(` - ${this.appEntries[apparatus.type].length} apparatus entries to typeset in total`)
        // get lines for each entry
        let entriesWithLineInfo = this.appEntries[apparatus.type].map ( (entry) => {
          let lineFrom = this.__getLineForMainTextIndex(entry.from)
          let lineTo = this.__getLineForMainTextIndex(entry.to)
          return {
            key: this.__getRangeUniqueString(lineFrom, lineTo),
            lineFrom: lineFrom,
            lineTo: lineTo,
            entry: entry
          }
        })
        this.lineRanges[apparatus.type] = {}

        entriesWithLineInfo.forEach( (entryWithLineInfo) => {
          if (this.lineRanges[apparatus.type][entryWithLineInfo.key] === undefined ) {
            this.lineRanges[apparatus.type][entryWithLineInfo.key] = {
              key: entryWithLineInfo.key,
              lineFrom: entryWithLineInfo.lineFrom,
              lineTo: entryWithLineInfo.lineTo,
              entries: []
            }
          }
          this.lineRanges[apparatus.type][entryWithLineInfo.key].entries.push(entryWithLineInfo.entry)
        })

        // this.debug && console.log(`Line Ranges for apparatus '${apparatus.type}'`)
        // this.debug && console.log(this.lineRanges[apparatus.type])
        // profiler.lap('line ranges calculated')

        // build items list for every line range
        let lineRangesKeys = Object.keys(this.lineRanges[apparatus.type])
        for (let lineRangeKeyIndex = 0; lineRangeKeyIndex < lineRangesKeys.length; lineRangeKeyIndex++) {
          let lineRange = this.lineRanges[apparatus.type][lineRangesKeys[lineRangeKeyIndex]]
          let items = []
          // line number
          pushArray(items, await this._getTsItemsFromStr(this.__getLineStringFromRange(lineRange.lineFrom, lineRange.lineTo), 'apparatus apparatusLineNumbers', textDirection))
          // TODO: change this to a penalty
          let glue = await this.__createNormalSpaceGlue('apparatus')
          items.push( (new Box()).setWidth(glue.getWidth()))

          for (let entryIndex = 0; entryIndex<lineRange.entries.length; entryIndex++) {
            let entry = lineRange.entries[entryIndex]
            // pre-lemma
            pushArray(items, await this._getTsItemsForPreLemma(entry))
            // lemma text
            pushArray(items, await this._getTsItemsForLemma(entry))
            // post lemma
            pushArray(items, await this._getTsItemsForPostLemma(entry))
            // separator
            pushArray(items, await this._getTsItemsForSeparator(entry))
            // typeset sub entries
            for (let subEntryIndex = 0; subEntryIndex < entry.subEntries.length; subEntryIndex++) {
              let subEntry = entry.subEntries[subEntryIndex]
              if (!subEntry.enabled) {
                continue
              }
              pushArray(items, await this._getSubEntryTsItems(subEntry))
              if (subEntryIndex !== entry.subEntries.length -1) {
                items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(textDirection))
              }
            }
            if (entryIndex !== lineRange.entries.length -1) {
              items.push((await this.__createNormalSpaceGlue('apparatus interEntry')).setTextDirection(textDirection))
              pushArray(items, await this._getTsItemsFromStr(verticalLine, 'apparatus entrySeparator', textDirection))
              items.push((await this.__createNormalSpaceGlue('apparatus interEntry')).setTextDirection(textDirection))
            }
          }
          items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(textDirection))
          pushArray(items, await this._getTsItemsFromStr(doubleVerticalLine, 'apparatus lineRangeSeparator', textDirection))
          items.push((await this.__createNormalSpaceGlue('apparatus afterLineRange')).setTextDirection(textDirection))
          lineRange.tsItemsExportObjects = items.map( (item) => { return item.getExportObject()})
        }
        // profiler.lap('line ranges typeset')
      }


      let lineRangesKeysToTypeset = Object.keys(this.lineRanges[apparatus.type]).filter( (lineRangeKey) => {
        return this.lineRanges[apparatus.type][lineRangeKey].lineFrom  >= firstLine && this.lineRanges[apparatus.type][lineRangeKey].lineFrom <= lastLine
      })
      lineRangesKeysToTypeset.sort()
      // this.debug && console.log(`Line ranges to typeset`)
      // this.debug && console.log(lineRangesKeysToTypeset)
      for (let lineRangeKeyIndex = 0; lineRangeKeyIndex < lineRangesKeysToTypeset.length; lineRangeKeyIndex++) {
        let lineRange = this.lineRanges[apparatus.type][lineRangesKeysToTypeset[lineRangeKeyIndex]]
        outputList.pushItemArray(this.__getTsItemsFromExportObjectArray(lineRange.tsItemsExportObjects))
      }
      if (outputList.getList().length !== 0) {
        outputList.pushItem(Glue.createLineFillerGlue().setTextDirection(textDirection))
        outputList.pushItem(Penalty.createForcedBreakPenalty())
      }
      // this.debug && console.log(` => Output`)
      // this.debug && console.log(outputList)
      // profiler.stop('output list prepared')
      resolve(outputList)
    })
  }

  /**
   *
   * @param {Object[]}exportObjects
   */
  __getTsItemsFromExportObjectArray(exportObjects) {
    return exportObjects.map ( (exportObject) => {
      return ObjectFactory.fromObject(exportObject)
    })
  }

  _getTsItemsForSeparator(entry) {
    return new Promise( async (resolve) => {
      let items = []
      switch(entry.separator) {
        case '':
          // default separator
          if (!ApparatusEntry.allSubEntriesInEntryObjectAreOmissions(entry)) {
            pushArray(items, await this._getTsItemsFromStr(defaultLemmaSeparator, 'apparatus', this.textDirection))
          }
          break

        case 'off':
          // no separator
          break

        case 'colon':
          pushArray(items, await this._getTsItemsFromStr(':', 'apparatus', this.textDirection))
          break

        default:
          // custom separator
          pushArray(items, await this._getTsItemsFromStr(removeExtraWhiteSpace(FmtText.getPlainText(entry.separator)), 'apparatus', this.textDirection))
          break
      }
      items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
      resolve(items)
    })
  }

  _getTsItemsForPostLemma(entry) {
    return new Promise( async (resolve) => {
      let items = []
      switch(entry.postLemma) {
        case '':
          //do nothing
          break

        // LEAVE this in case there are standard post-lemma strings
        //
        // case 'ante':
        // case 'post':
        //   let keyword = this.editionStyle.strings[entry.preLemma]
        //   let keywordTextBox = await this.ss.apply((new TextBox()).setText(keyword).setTextDirection(this.textDirection), 'apparatus apparatusKeyword')
        //   items.push(keywordTextBox)
        //   items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
        //   break

        default:
          // a custom post lemma
          items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
          // TODO: check formatting here
          let customPostLemmaBox = await this.ss.apply((new TextBox()).setText(FmtText.getPlainText(entry.postLemma)).setTextDirection(this.textDirection), 'apparatus apparatusKeyword')
          items.push(customPostLemmaBox)
          // items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
      }

      resolve(items)
    })
  }

  _getTsItemsForPreLemma(entry) {
    return new Promise( async (resolve) => {
      let items = []
      switch(entry.preLemma) {
        case '':
          //do nothing
          break

        case 'ante':
        case 'post':
          let keyword = this.editionStyle.strings[entry.preLemma]
          let keywordTextBox = await this.ss.apply((new TextBox()).setText(keyword).setTextDirection(this.textDirection), 'apparatus apparatusKeyword')
          items.push(keywordTextBox)
          items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
          break

        default:
          // a custom pre-lemma
          let customPreLemmaText = FmtText.getPlainText(entry.preLemma)
          this.debug && console.log(`Custom pre-lemma: '${customPreLemmaText}'`)
          let customPreLemmaBox = await this.ss.apply(
            (new TextBox())
              .setText(customPreLemmaText)
              .setTextDirection(this.textDirection),
            'apparatus apparatusKeyword')
          items.push(customPreLemmaBox)
          items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
      }

      resolve(items)
    })
  }

  _getTsItemsForSigla(subEntry) {
    return new Promise( async (resolve) => {
      let items = []
      let siglaData = ApparatusUtil.getSiglaData(subEntry.witnessData, this.sigla, this.siglaGroups)
      for (let i = 0; i < siglaData.length; i++) {
        let siglumData = siglaData[i]
        let siglumItem = await this.ss.apply(TextBoxFactory.simpleText(siglumData.siglum), 'apparatus')
        this.__detectAndSetTextBoxTextDirection(siglumItem)
        items.push(siglumItem)
        if (siglumData.hand !== 0) {
          let handItem = await this.ss.apply(TextBoxFactory.simpleText(this.getNumberString(siglumData.hand, this.edition.lang)), 'apparatus superscript')
          this.__detectAndSetTextBoxTextDirection(handItem)
          items.push(handItem)
        }
      }
      resolve(items)
    })
  }


  _getTsItemsForLemma(entry) {
    return new Promise( async (resolve) => {
      let tsItems = []
      let lemmaComponents = ApparatusUtil.getLemmaComponents(entry.lemma, entry.lemmaText)

      switch(lemmaComponents.type) {
        case 'custom':
          tsItems = await this._getTsItemsFromStr(lemmaComponents.text, 'apparatus', 'detect')
          resolve(tsItems)
          return

        case 'full':
          pushArray(tsItems, await this._getTsItemsFromStr(entry.lemmaText, 'apparatus', 'detect') )
          pushArray(tsItems, await this._getTsItemsForLemmaOccurrenceNumber(entry.from))
          resolve(tsItems)
          return

        case 'shortened':
          pushArray(tsItems, await this._getTsItemsFromStr(lemmaComponents.from, 'apparatus', 'detect') )
          pushArray(tsItems, await this._getTsItemsForLemmaOccurrenceNumber(entry.from))
          pushArray(tsItems, await this._getTsItemsFromStr(lemmaComponents.separator, 'apparatus', 'detect') )
          pushArray(tsItems, await this._getTsItemsFromStr(lemmaComponents.to, 'apparatus', 'detect') )
          pushArray(tsItems, await this._getTsItemsForLemmaOccurrenceNumber(entry.to))
          resolve(tsItems)
          return

        default:
          console.warn(`Unknown lemma component type '${lemmaComponents.type}'`)
          resolve( await this._getTsItemsFromStr('Lemma???', 'apparatus', 'detect'))
          return
      }
    })

  }

  _getOccurrenceInLineInfo(mainTextIndex) {
    if (this.extractedMetadataInfo === undefined) {
      console.warn(`Attempting to get occurrence in line values before extracting info from typeset metadata`)
      return [1, 1]
    }

    let infoIndex = this.mainTextIndices.indexOf(mainTextIndex)
    if (infoIndex === -1) {
      console.warn(`No occurrence in line info found for main text index ${mainTextIndex}`)
      return [1, 1]
    }
    return [this.extractedMetadataInfo[infoIndex].occurrenceInLine, this.extractedMetadataInfo[infoIndex].totalOccurrencesInLine ]
  }

  _getTsItemsForLemmaOccurrenceNumber(mainTextIndex) {
    return new Promise (async (resolve) => {
      let tsItems = []
      let lemmaNumberString = ''
      let [occurrenceInLine, numberOfOccurrencesInLine] = this._getOccurrenceInLineInfo(mainTextIndex)
      if (numberOfOccurrencesInLine > 1) {
        lemmaNumberString = this.getNumberString(occurrenceInLine, this.edition.lang)
      }
      if (lemmaNumberString !== '') {
        let lemmaNumberTextBox = TextBoxFactory.simpleText(lemmaNumberString)
        await this.ss.apply(lemmaNumberTextBox, [ 'apparatus superscript'])
        this.__detectAndSetTextBoxTextDirection(lemmaNumberTextBox)
        tsItems.push(lemmaNumberTextBox)
      }
      resolve(tsItems)
    })
  }

  getNumberString(n, lang) {
    if (lang === 'ar') {
      return NumeralStyles.toDecimalArabic(n)
    }
    return NumeralStyles.toDecimalWestern(n)
  }
  _getSubEntryTsItems(subEntry) {
    return new Promise( async (resolve) => {
      let items = []
      switch(subEntry.type) {
        case 'variant':
          pushArray(items, this.__setTextDirection(await this.tokenRenderer.renderWithStyle(subEntry.fmtText, 'apparatus'), 'detect'))
          items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
          pushArray(items, await this._getTsItemsForSigla(subEntry))
          // let siglaTextBox = await this.ss.apply((new TextBox()).setText(this.__getSiglaString(subEntry.witnessData)), 'apparatus')
          // items.push(siglaTextBox.setTextDirection(this.textDirection))
          break

        case 'omission':
        case 'addition':
          let keyword = this.editionStyle.strings[subEntry.type]
          let keywordTextBox = await this.ss.apply((new TextBox()).setText(keyword).setTextDirection(this.textDirection), 'apparatus apparatusKeyword')
          items.push(keywordTextBox)
          items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
          if (subEntry.type === 'addition') {
            pushArray(items, this.__setTextDirection(await this.tokenRenderer.renderWithStyle(subEntry.fmtText, 'apparatus'), 'detect'))
            items.push((await this.__createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
          }
          pushArray(items, await this._getTsItemsForSigla(subEntry))
          // let siglaTextBox2 = await this.ss.apply((new TextBox()).setText(this.__getSiglaString(subEntry.witnessData)), 'apparatus')
          // items.push(siglaTextBox2.setTextDirection(this.textDirection))
          break

        case 'fullCustom': {
          // this.debug && console.log(`Adding full custom sub entry: '${FmtText.getPlainText(subEntry.fmtText)}'`)
          let fullCustomItems  = this.__setTextDirection(await this.tokenRenderer.renderWithStyle(subEntry.fmtText, 'apparatus'), 'detect')
          // this.debug && console.log(fullCustomItems)

          pushArray(items, fullCustomItems)
          break
        }
      }
      resolve(items)
    })

  }
  __getLineStringFromRange(from, to) {
    if (from === to) {
      return this.getNumberString(from, this.edition.lang)
    }
    return `${this.getNumberString(from, this.edition.lang)}-${this.getNumberString(to, this.edition.lang)}`
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
  __detectAndSetTextBoxTextDirection(textBox) {
    if (textBox.getTextDirection() !== '') {
      // do not change if text direction is already set
      this.debug && console.log(`Text box '${textBox.getText()}' direction is already set: '${textBox.getTextDirection()}'`)
      return textBox
    }
    let detectedLang
    // take care of neutral punctuation on its own
    const neutralPunctuationCharacters = [ '[', ']', '(', ')', '{', '}', '«', '»', '.', ',', ';', '...', '"']
    if (neutralPunctuationCharacters.indexOf(textBox.getText()) !== -1) {
      detectedLang = this.edition.lang
    } else {
      detectedLang = this.languageDetector.detectLang(textBox.getText())
    }
    if (detectedLang !== this.edition.lang) {
      this.debug && console.log(`Text box with non '${this.edition.lang}' text: '${textBox.getText()}' ('${detectedLang}' detected)`)
    }
    if (isRtl(detectedLang)) {
      return textBox.setRightToLeft()
    } else {
      return textBox.setLeftToRight()
    }
  }
  /**
   *
   * @param {string}someString
   * @param {string}style
   * @param {string}textDirection
   * @return {Promise<unknown>}
   * @private
   */
  _getTsItemsFromStr(someString, style = 'normal', textDirection = 'detect') {
    return new Promise( async (resolve) => {
      let fmtText = FmtTextFactory.fromString(someString)

      let items = await this.tokenRenderer.renderWithStyle(fmtText, style)
      items = this.__setTextDirection(items, textDirection)
      resolve(items)
    })
  }

  /**
   *
   * @param {TypesetterItem[]}items
   * @param {string}textDirection
   * @private
   */
  __setTextDirection(items, textDirection) {
    switch(textDirection) {
      case 'rtl':
      case 'ltr':
        items.forEach( (item) => {
          item.setTextDirection(textDirection)
        })
        break

      case 'detect':
        items.forEach((item) => {
          if (item instanceof TextBox ) {
            return this.__detectAndSetTextBoxTextDirection(item)
          }
          return item
        })
        break
    }
    return items
  }
}