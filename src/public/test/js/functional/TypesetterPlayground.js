/*
  Small app to test (and develop) the capabilities of the (new) Typesetter2

  created: 21 Mar 2022
 */

import { TextBoxFactory } from '../../../js/Typesetter2/TextBoxFactory'
import { BrowserUtilities } from '../../../js/toolbox/BrowserUtilities'
import { SystemTextBoxMeasurer } from '../../../js/Typesetter2/SystemTextBoxMeasurer'
import { CanvasTextBoxTokenMeasurer } from '../../../js/Typesetter2/CanvasTextBoxTokenMeasurer'
import { RaggedTypesetter } from '../../../js/Typesetter2/RaggedTypesetter'
import { removeExtraWhiteSpace } from '../../../js/toolbox/Util.mjs'
import { Glue } from '../../../js/Typesetter2/Glue'
import { Typesetter2 } from '../../../js/Typesetter2/Typesetter2'

const defaultPageWidth = Typesetter2.cm2px(14.1)
const defaultPageHeight  = Typesetter2.cm2px(21)

const defaultMarginTop = Typesetter2.cm2px(1)
const defaultMarginLeft = Typesetter2.cm2px(1)
const defaultMarginBottom = Typesetter2.cm2px(1)
const defaultMarginRight = Typesetter2.cm2px(1)


const defaultFonts = [ 'Times New Roman', 'Arial', 'GentiumBasic', 'FreeSerif', 'Linux Libertine']

const defaultFontSize = Typesetter2.pt2px(12)
const defaultLineSkip = Typesetter2.pt2px(18)

$( () => {
  new Playground()
})


class Playground {

  constructor () {

    this.inputTextArea = $('#textToTypesetTextArea')
    this.pageWidthInput = $('#pageWidth')
    this.pageHeightInput = $('#pageHeight')
    this.marginTopInput = $('#marginTop')
    this.marginBottomInput = $('#marginBottom')
    this.marginLeftInput = $('#marginLeft')
    this.marginRightInput = $('#marginRight')
    this.fontFamilyInput = $('#fontFamily')
    this._setupFontFamilyInput(this.fontFamilyInput, defaultFonts)
    this.fontSizeInput = $('#fontSize')
    this.lineSkipInput = $('#lineSkip')

    this.canvas = document.getElementById('theCanvas')
    BrowserUtilities.setCanvasHiPDI(this.canvas, Math.round(defaultPageWidth), Math.round(defaultPageHeight))

    let systemMeasurer = new SystemTextBoxMeasurer()
    systemMeasurer.setMeasurer(new CanvasTextBoxTokenMeasurer())

    this.pageWidth = defaultPageWidth
    this.pageHeight = defaultPageHeight
    this.marginTop = defaultMarginTop
    this.marginRight = defaultMarginRight
    this.marginBottom = defaultMarginBottom
    this.marginLeft = defaultMarginLeft
    this._setFont(defaultFonts[0], defaultFontSize)
    this.lineSkip = defaultLineSkip
    this._setInputFieldsFromCurrentValues()

    this.lastText = this.inputTextArea.val()
    this._renderTypesetText( this._typesetPlainText(this.lastText))

    this.inputTextArea.on('keyup', this.genOnChangeInputText())
    this.marginTopInput.on('change', this.getOnChangeInputField())
    this.marginBottomInput.on('change', this.getOnChangeInputField())
    this.marginLeftInput.on('change', this.getOnChangeInputField())
    this.marginRightInput.on('change', this.getOnChangeInputField())
    this.pageWidthInput.on('change', this.getOnChangeInputField())
    this.pageHeightInput.on('change', this.getOnChangeInputField())
    this.fontFamilyInput.on('change', this.getOnChangeInputField())
    this.fontSizeInput.on('change', this.getOnChangeInputField())
    this.lineSkipInput.on('change', this.getOnChangeInputField())
  }

  getOnChangeInputField() {
    return () => {
      this._getDataFromInputFields()
      this._renderTypesetText( this._typesetPlainText(this.lastText))
    }
  }

  genOnChangeInputText() {
    return () => {
      let newText = this.inputTextArea.val()
      if (newText !== this.lastText) {
        console.log(`New input text: '${this.inputTextArea.val()}'`)
        this.lastText = newText
        this._renderTypesetText( this._typesetPlainText(newText))
      }
    }
  }

  _setupFontFamilyInput(input, fontArray) {
    input.html( fontArray.map( (fontName, i) => {
      return `<option value="${i}">${fontName}</option>`
    }))

  }

  _setInputFieldsFromCurrentValues() {
    this.pageWidthInput.val(Typesetter2.px2cm(this.pageWidth))
    this.pageHeightInput.val(Typesetter2.px2cm(this.pageHeight))
    this.marginTopInput.val(Typesetter2.px2cm(this.marginTop))
    this.marginBottomInput.val(Typesetter2.px2cm(this.marginBottom))
    this.marginLeftInput.val(Typesetter2.px2cm(this.marginLeft))
    this.marginRightInput.val(Typesetter2.px2cm(this.marginRight))
    this.fontFamilyInput.val(defaultFonts.indexOf(this.fontFamily))
    this.fontSizeInput.val(Typesetter2.px2pt(this.fontSize))
    this.lineSkipInput.val(Typesetter2.px2pt(this.lineSkip))
  }

  _getDataFromInputFields() {
    this.pageWidth = this.__getPxDimensionFromInputField('cm', this.pageWidthInput, 100, 1000, defaultPageWidth)
    this.pageHeight = this.__getPxDimensionFromInputField('cm',this.pageHeightInput, 100, 2000, defaultPageHeight)
    this.marginTop = this.__getPxDimensionFromInputField('cm',this.marginTopInput, 0, this.pageHeight/2, defaultMarginTop)
    this.marginBottom = this.__getPxDimensionFromInputField('cm',this.marginBottomInput, 0, this.pageHeight/2, defaultMarginBottom)
    this.marginLeft = this.__getPxDimensionFromInputField('cm',this.marginLeftInput, 0, this.pageWidth/2, defaultMarginLeft)
    this.marginRight = this.__getPxDimensionFromInputField('cm',this.marginRightInput, 0, this.pageWidth/2, defaultMarginRight)
    this.fontFamily = defaultFonts[this.fontFamilyInput.val()]
    this.fontSize = this.__getPxDimensionFromInputField('pt', this.fontSizeInput, 8, 36, 12)
    this.lineSkip = this.__getPxDimensionFromInputField('pt', this.lineSkipInput, 12, 72, 24)

   }

   __getPxDimensionFromInputField(unit, input, min, max, defaultValue) {
    let unit2px = (u) => {return u}
     let px2unit = (px) => {return px}
     switch(unit) {
       case 'cm':
         unit2px = Typesetter2.cm2px
         px2unit = Typesetter2.px2cm
         break

       case 'pt':
         unit2px = Typesetter2.pt2px
         px2unit = Typesetter2.px2pt
     }
    let inputValue = unit2px(input.val())
    if (inputValue < min || inputValue > max) {
      input.val(px2unit(defaultValue))
      return defaultValue
    }
    return inputValue
   }

  _setFont(fontFamily, fontSize) {
    this.fontFamily = fontFamily
    this.fontSize = fontSize
    let spaceToken = TextBoxFactory.simpleText(' ',{fontFamily: this.fontFamily, fontSize: this.fontSize})
    this.normalSpaceWidth = (new SystemTextBoxMeasurer()).getTokenWidth(spaceToken.textTokens[0])
    this.normalSpaceStretch = this.normalSpaceWidth/6
    this.normalSpaceShrink = this.normalSpaceWidth/9
  }

  _typesetPlainText(plainText) {
    // one word per line, just to see that the playground is working
    let words = removeExtraWhiteSpace(plainText).split(' ').map ( (word) => {
      return TextBoxFactory.simpleText(word, { fontFamily: this.fontFamily, fontSize: this.fontSize})
    })
    let tokensToTypeset = []
    words.forEach( (token) => {
      tokensToTypeset.push(token)
      let glueToken = (new Glue()).setWidth(this.normalSpaceWidth)
        .setStretch(this.normalSpaceStretch)
        .setShrink(this.normalSpaceShrink)
      tokensToTypeset.push(glueToken)
    })

    //let ts = new WordPerLineTypesetter(24)
    let ts = new RaggedTypesetter(this.pageWidth-this.marginRight-this.marginLeft, this.lineSkip)
    return ts.typesetTokens(tokensToTypeset)
  }

  _renderTypesetText(typesetTokens, canvasElement) {

    console.log(`Rendering typeset tokens`)
    console.log(typesetTokens)
    BrowserUtilities.setCanvasHiPDI(this.canvas, Math.round(this.pageWidth), Math.round(this.pageHeight))

    let ctx = this.canvas.getContext('2d')
    ctx.clearRect(0,0, this.canvas.width, this.canvas.height)
    typesetTokens.forEach( (token) => {
      if (token.constructor.name === 'TextBox') {
        token.textTokens.forEach( (textToken) => {
          ctx.font = `${textToken.getFontSize()}px ${textToken.getFontFamily()}`
          ctx.fillText(textToken.getText(), token.getX() + this.marginLeft, token.getY() + this.marginTop)
        })
      }
    })
  }



}
