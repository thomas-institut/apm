/*
  Small app to test (and develop) the capabilities of the (new) Typesetter2

  created: 21 Mar 2022
 */

import { TextBoxFactory } from '../../../js/Typesetter2/TextBoxFactory'
import { BrowserUtilities } from '../../../js/toolbox/BrowserUtilities'
import { SystemTextBoxMeasurer } from '../../../js/Typesetter2/SystemTextBoxMeasurer'
import { CanvasTextBoxMeasurer } from '../../../js/Typesetter2/CanvasTextBoxMeasurer'
import { removeExtraWhiteSpace } from '../../../js/toolbox/Util.mjs'
import { Glue } from '../../../js/Typesetter2/Glue'
import { Typesetter2 } from '../../../js/Typesetter2/Typesetter2'
import { TextBox } from '../../../js/Typesetter2/TextBox'
import { SimpleTypesetter } from '../../../js/Typesetter2/SimpleTypesetter'
import { ItemList } from '../../../js/Typesetter2/ItemList'
import * as TypesetterItemDirection from '../../../js/Typesetter2/TypesetterItemDirection'
import { CanvasRenderer } from '../../../js/Typesetter2/CanvasRenderer'

const defaultPageWidth = Typesetter2.cm2px(14.1)
const defaultPageHeight  = Typesetter2.cm2px(21)

const defaultMarginTop = Typesetter2.cm2px(1)
const defaultMarginLeft = Typesetter2.cm2px(1)
const defaultMarginBottom = Typesetter2.cm2px(1)
const defaultMarginRight = Typesetter2.cm2px(1)

const sampleText = `This is the text to typeset. Write whatever you want in here and see the results in the html 
canvas to the left. 

En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor. Una olla de algo más vaca que carnero, salpicón las más noches, duelos y quebrantos los sábados, lantejas los viernes, algún palomino de añadidura los domingos, consumían las tres cuartas partes de su hacienda. El resto della concluían sayo de velarte, calzas de velludo para las fiestas, con sus pantuflos de lo mesmo, y los días de entresemana se honraba con su vellorí de lo más fino. Tenía en su casa una ama que pasaba de los cuarenta, y una sobrina que no llegaba a los veinte, y un mozo de campo y plaza, que así ensillaba el rocín como tomaba la podadera. Frisaba la edad de nuestro hidalgo con los cincuenta años; era de complexión recia, seco de carnes, enjuto de rostro, gran madrugador y amigo de la caza. Quieren decir que tenía el sobrenombre de Quijada, o Quesada, que en esto hay alguna diferencia en los autores que deste caso escriben; aunque, por conjeturas verosímiles, se deja entender que se llamaba Quejana. Pero esto importa poco a nuestro cuento; basta que en la narración dél no se salga un punto de la verdad. `


const defaultFonts = [ 'Times New Roman', 'Arial', 'GentiumBasic', 'FreeSerif', 'Linux Libertine']

const defaultFontSize = Typesetter2.pt2px(12)
const defaultLineSkip = Typesetter2.pt2px(18)

$( () => {
  new Playground()
})


class Playground {

  constructor () {

    this.inputTextArea = $('#textToTypesetTextArea')
    this.inputTextArea.text(sampleText)
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
    this.canvasRenderer = new CanvasRenderer(this.canvas)

    let systemMeasurer = new SystemTextBoxMeasurer()
    systemMeasurer.setMeasurer(new CanvasTextBoxMeasurer())

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
    this._render( this._typesetPlainText(this.lastText))

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
      this._render( this._typesetPlainText(this.lastText))
    }
  }

  genOnChangeInputText() {
    return () => {
      let newText = this.inputTextArea.val()
      if (newText !== this.lastText) {
        console.log(`New input text: '${this.inputTextArea.val()}'`)
        this.lastText = newText
        this._render( this._typesetPlainText(newText))
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
    let spaceTextBox = TextBoxFactory.simpleText(' ',{fontFamily: this.fontFamily, fontSize: this.fontSize})
    this.normalSpaceWidth = (new SystemTextBoxMeasurer()).getBoxWidth(spaceTextBox)
    this.normalSpaceStretch = this.normalSpaceWidth/6
    this.normalSpaceShrink = this.normalSpaceWidth/9
  }

  _typesetPlainText(plainText) {
    // one word per line, just to see that the playground is working
    let wordTextBoxes = removeExtraWhiteSpace(plainText).split(' ').map ( (word) => {
      return TextBoxFactory.simpleText(word, { fontFamily: this.fontFamily, fontSize: this.fontSize})
    })
    let listToTypeset = new ItemList(TypesetterItemDirection.HORIZONTAL)
    let tokensToTypeset = []
    wordTextBoxes.forEach( (textBox, i) => {
      listToTypeset.pushItem(textBox)
      let glueToken = (new Glue()).setWidth(this.normalSpaceWidth)
        .setStretch(this.normalSpaceStretch)
        .setShrink(this.normalSpaceShrink)
      if (i !== wordTextBoxes.length - 1) {
        listToTypeset.pushItem(glueToken)
      }
    })

    //let ts = new WordPerLineTypesetter(24)
    let ts = new SimpleTypesetter(this.pageWidth-this.marginRight-this.marginLeft, this.lineSkip)
    return ts.typesetHorizontalList(listToTypeset)
  }

  _render(mainText) {
    console.log(`Rendering main text, height = ${mainText.getHeight()}`)
    console.log(mainText)
    BrowserUtilities.setCanvasHiPDI(this.canvas, Math.round(this.pageWidth), Math.round(this.pageHeight))
    let ctx = this.canvas.getContext('2d')
    ctx.clearRect(0,0, this.canvas.width, this.canvas.height)
    this.canvasRenderer.renderVerticalList(mainText, this.marginRight, this.marginTop)
  }
}
