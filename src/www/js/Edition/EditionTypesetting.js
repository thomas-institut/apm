import { MainText } from './MainText'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Typesetter2 } from '../Typesetter2/Typesetter2.mjs'
import { TextBoxMeasurer } from '../Typesetter2/TextBoxMeasurer/TextBoxMeasurer.mjs'
import { TextBoxFactory } from '../Typesetter2/TextBoxFactory.mjs'
import { Box } from '../Typesetter2/Box.mjs'
import { ItemList } from '../Typesetter2/ItemList.mjs'
import * as TypesetterItemDirection from '../Typesetter2/TypesetterItemDirection.mjs'
import * as MetadataKey from '../Typesetter2/MetadataKey.mjs'
import { Glue } from '../Typesetter2/Glue.mjs'
import * as MainTextTokenType from './MainTextTokenType'
import { TextBox } from '../Typesetter2/TextBox.mjs'
import { Typesetter2TokenRenderer } from '../FmtText/Renderer/Typesetter2TokenRenderer'
import { Penalty } from '../Typesetter2/Penalty.mjs'


const defaultSpaceStretchFactor = 1/6
const defaultSpaceShrinkFactor = 1/3

const defaultParagraphStyles = {
  normal: { indentInEms: 2},
  h1: { fontSizeFactor: 1.5, fontWeight: 'bold', center: true, spaceBeforeInEms: 2, spaceAfterInEms: 1},
  h2: { fontSizeFactor: 1.2, fontWeight: 'bold', spaceBeforeInEms: 1, spaceAfterInEms: 0.5},
  h3: { fontWeight: 'bold', spaceBeforeInEms: 0.5, spaceAfterInEms: 0.25}
}



export class EditionTypesetting {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'EditionTypesetting',
      optionsDefinition: {
        lang: { type: 'string', required: true},
        defaultFontFamily: { type: 'string', required: true},
        // default font size in pixels
        defaultFontSize: { type: 'number', default: Typesetter2.pt2px(12)},
        spaceStretchFactor: { type: 'number', default: defaultSpaceStretchFactor},
        spaceShrinkFactor: { type: 'number', default: defaultSpaceShrinkFactor},
        paragraphStyles: { type: 'object', default: defaultParagraphStyles},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        debug: { type: 'boolean',  default: false}

      }
    })
    this.options = oc.getCleanOptions(options)

    this.paragraphStyles = {}
    Object.keys(this.options.paragraphStyles).forEach( (style) => {
      let styleOc = new OptionsChecker({
        context: `Edition Typesetting, paragraph style ${style}`,
        optionsDefinition: {
          // The font size as a multiplier of the default font size
          fontSizeFactor: { type: 'number', default: 1},
          // The paragraph indent in ems (1 em = the paragraph's font size)
          indentInEms: { type: 'number', default: 0},
          fontFamily: { type: 'string', default: this.options.defaultFontFamily},
          fontWeight: { type: 'string', default: ''},
          fontStyle: { type: 'string', default: ''},
          center: { type: 'boolean', default: false},
          spaceAfterInEms: { type: 'number', default: 0},
          spaceBeforeInEms: { type: 'number', default: 0},
          // the normal space width as a factor of the length of single space character
          spaceWidthFactor: { type: 'number', default: 1},
          // the normal space stretch as a factor of the style's space width
          spaceStretchFactor: { type: 'number', default: this.options.spaceStretchFactor},
          // the normal space shrink as a factor of the style's space width
          spaceShrinkFactor: { type: 'number', default: this.options.spaceShrinkFactor}
        }
      })
      this.paragraphStyles[style] = styleOc.getCleanOptions(this.options.paragraphStyles[style])
    })
    this.debug = this.options.debug

    this.debug && console.log(`Paragraph styles`)
    this.debug && console.log(this.paragraphStyles)
    this.textBoxMeasurer = this.options.textBoxMeasurer
    this.defaultFontFamily = this.options.defaultFontFamily
    this.defaultFontSize = this.options.defaultFontSize
    this.isSetup = false
  }

  setup() {
    return new Promise( (resolve) => {
      this.__setupParagraphStyles().then( () => {
        this.debug && console.log(`Set up paragraph styles`)
        this.debug && console.log(this.paragraphStyles)
        this.isSetup = true
        resolve(true)
      })
    })
  }

  async __setupParagraphStyles () {
    let styleNames = Object.keys(this.paragraphStyles)
    for (let i = 0; i < styleNames.length; i++) {
      let style = styleNames[i]
      let styleDef = this.paragraphStyles[style]
      styleDef.fontSize = this.defaultFontSize * styleDef.fontSizeFactor
      styleDef.spaceWidth = await this.getSpaceWidth(styleDef.fontFamily, styleDef.fontSize, styleDef.fontStyle, styleDef.fontWeight)
      styleDef.indentWidth = styleDef.fontSize * styleDef.indentInEms
      styleDef.spaceWidth = styleDef.spaceWidth * styleDef.spaceWidthFactor
      styleDef.spaceShrink = styleDef.spaceWidth * styleDef.spaceShrinkFactor
      styleDef.spaceStretch = styleDef.spaceWidth * styleDef.spaceStretchFactor
      styleDef.spaceAfter = styleDef.spaceAfterInEms *  styleDef.fontSize
      styleDef.spaceBefore = styleDef.spaceBeforeInEms *  styleDef.fontSize
      styleDef.tokenRenderer = new Typesetter2TokenRenderer({
        defaultFontFamily: styleDef.fontFamily,
        defaultFontSize: styleDef.fontSize,
        defaultFontWeight: styleDef.fontWeight,
        defaultFontStyle: styleDef.fontStyle,
        normalSpaceWidth: styleDef.spaceWidth,
        normalSpaceShrink: styleDef.spaceShrink,
        normalSpaceStretch: styleDef.spaceStretch
      })
    }
  }

  /**
   *
   * @param {string}fontFamily
   * @param {number}fontSize
   * @param {string}fontStyle
   * @param {string}fontWeight
   * @return {Promise<number>}
   */
  getSpaceWidth(fontFamily, fontSize, fontStyle = '', fontWeight= '') {
    return new Promise( (resolve) => {
      let spaceTextBox = new TextBox()
      spaceTextBox.setText(' ')
        .setFontFamily(fontFamily)
        .setFontSize(fontSize)
        .setFontStyle(fontStyle)
        .setFontWeight(fontWeight)
      this.textBoxMeasurer.getBoxWidth(spaceTextBox).then( (width) => {
        resolve(width)
      })
    })
  }


  /**
   *
   * @param {Edition}edition
   * @return {ItemList}
   */
  generateListToTypesetFromMainText(edition) {
    if (!this.isSetup) {
      throw 'EditionTypesetting not set up yet'
    }
    let textDirection = this.__getTextDirectionFromLang(this.options.lang)
    let verticalItems = []


    MainText.getParagraphs(edition.mainText).forEach( (mainTextParagraph) => {
      let paragraphToTypeset = new ItemList(TypesetterItemDirection.HORIZONTAL)
      let paragraphStyle = mainTextParagraph.type
      let paragraphStyleDef = this.paragraphStyles[paragraphStyle]
      if (paragraphStyleDef === undefined) {
        console.warn(`Unknown main text paragraph type '${mainTextParagraph.type}', using 'normal`)
        paragraphStyleDef = this.paragraphStyles['normal']
      }
      if (paragraphStyleDef.spaceBefore !== 0) {
        verticalItems.push( (new Glue(TypesetterItemDirection.VERTICAL)).setHeight(paragraphStyleDef.spaceBefore))
      }
      if (textDirection === 'rtl') {
        paragraphToTypeset.pushItem( (new Box().setWidth(0)))
        paragraphToTypeset.pushItem(Glue.createLineFillerGlue())
      }
      if (textDirection === 'ltr' && paragraphStyleDef.indentWidth !== 0 ) {
        paragraphToTypeset.pushItem(this.__createIndentBox(paragraphStyle))
      }
      if (textDirection === 'ltr' && paragraphStyleDef.center) {
        paragraphToTypeset.pushItem( (new Box().setWidth(0)))
        paragraphToTypeset.pushItem(Glue.createLineFillerGlue())
      }
      mainTextParagraph.tokens.forEach( (mainTextToken) => {
        switch(mainTextToken.type) {
          case MainTextTokenType.GLUE:
            paragraphToTypeset.pushItem(
              this.__createNormalSpaceGlue(paragraphStyle).addMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX, mainTextToken.originalIndex)
            )
            break

          case MainTextTokenType.TEXT:
            let textItems = paragraphStyleDef.tokenRenderer.render(mainTextToken.fmtText, this.options.lang)
            if (textItems.length > 0) {
              // tag the first item with the original index
              textItems[0].addMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX, mainTextToken.originalIndex)
              paragraphToTypeset.pushItemArray(textItems)
            }
            break

        }
      })
      if (textDirection === 'rtl' && paragraphStyleDef.indentWidth !== 0 ) {
        paragraphToTypeset.pushItem(this.__createIndentBox(paragraphStyle))
      }
      if (textDirection === 'ltr') {
        paragraphToTypeset.pushItem(Glue.createLineFillerGlue())
      }
      if (textDirection === 'rtl' && paragraphStyleDef.center) {
        paragraphToTypeset.pushItem(Glue.createLineFillerGlue())
      }

      paragraphToTypeset.pushItem(Penalty.createForcedBreakPenalty())
      verticalItems.push(paragraphToTypeset)
      if (paragraphStyleDef.spaceAfter !== 0) {
        verticalItems.push( (new Glue(TypesetterItemDirection.VERTICAL)).setHeight(paragraphStyleDef.spaceAfter))
      }
    })

    let verticalListToTypeset = new ItemList(TypesetterItemDirection.VERTICAL)
    verticalListToTypeset.setList(verticalItems)

    return verticalListToTypeset
  }

  /**
   *
   * @return {Box}
   * @private
   */
  __createIndentBox(style) {
    return (new Box()).setWidth(this.paragraphStyles[style].indentWidth)
  }


  __createNormalSpaceGlue(style) {
    return (new Glue()).setWidth(this.paragraphStyles[style].spaceWidth)
      .setStretch(this.paragraphStyles[style].spaceStretch)
      .setShrink(this.paragraphStyles[style].spaceShrink)
  }


  __getTextDirectionFromLang(lang) {
    switch (lang) {
      case 'ar':
      case 'he':
        return 'rtl'

      default:
        return 'ltr'
    }
  }



}