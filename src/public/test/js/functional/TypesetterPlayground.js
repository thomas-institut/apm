/*
  Small app to test (and develop) the capabilities of the (new) Typesetter2

  created: 21 Mar 2022
 */

import { TextBoxFactory } from '../../../js/Typesetter2/TextBoxFactory.mjs'
import { BrowserUtilities } from '../../../js/toolbox/BrowserUtilities.mjs'
import { CanvasTextBoxMeasurer } from '../../../js/Typesetter2/CanvasTextBoxMeasurer.mjs'
import { removeExtraWhiteSpace } from '../../../js/toolbox/Util.mjs'
import { Glue } from '../../../js/Typesetter2/Glue.mjs'
import { Typesetter2 } from '../../../js/Typesetter2/Typesetter2.mjs'
import { SimpleTypesetter } from '../../../js/Typesetter2/SimpleTypesetter.mjs'
import { ItemList } from '../../../js/Typesetter2/ItemList.mjs'
import * as TypesetterItemDirection from '../../../js/Typesetter2/TypesetterItemDirection.mjs'
import { CanvasRenderer } from '../../../js/Typesetter2/CanvasRenderer.mjs'
import * as PDFLib from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { PdfRenderer } from '../../../js/Typesetter2/PdfRenderer.mjs'
import { TypesetterDocument } from '../../../js/Typesetter2/TypesetterDocument.mjs'

const defaultPageWidth = Typesetter2.cm2px(14.8)
const defaultPageHeight  = Typesetter2.cm2px(21)

const defaultMarginTop = Typesetter2.cm2px(1)
const defaultMarginLeft = Typesetter2.cm2px(1)
const defaultMarginBottom = Typesetter2.cm2px(1)
const defaultMarginRight = Typesetter2.cm2px(1)

const sampleText = `This is the text to typeset. Write whatever you want in here and see the results in the html 
canvas to the left. 

En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor. Una olla de algo más vaca que carnero, salpicón las más noches, duelos y quebrantos los sábados, lantejas los viernes, algún palomino de añadidura los domingos, consumían las tres cuartas partes de su hacienda. El resto della concluían sayo de velarte, calzas de velludo para las fiestas, con sus pantuflos de lo mesmo, y los días de entresemana se honraba con su vellorí de lo más fino. Tenía en su casa una ama que pasaba de los cuarenta, y una sobrina que no llegaba a los veinte, y un mozo de campo y plaza, que así ensillaba el rocín como tomaba la podadera. Frisaba la edad de nuestro hidalgo con los cincuenta años; era de complexión recia, seco de carnes, enjuto de rostro, gran madrugador y amigo de la caza. Quieren decir que tenía el sobrenombre de Quijada, o Quesada, que en esto hay alguna diferencia en los autores que deste caso escriben; aunque, por conjeturas verosímiles, se deja entender que se llamaba Quejana. Pero esto importa poco a nuestro cuento; basta que en la narración dél no se salga un punto de la verdad. `


const defaultFonts = [ 'FreeSerif', 'Arial', 'GentiumBasic', 'Linux Libertine']

const defaultFontSize = Typesetter2.pt2px(12)
const defaultLineSkip = Typesetter2.pt2px(18)

const zoomSteps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4]
const defaultZoomStep = 3

const defaultCanvasPageMargin = 20

const freeSerifFontUrl = 'https://averroes.uni-koeln.de/fonts/freefont/FreeSerif.ttf'
let freeSerifFontBytes = null

const linuxLibertineFontUrl = 'https://averroes.uni-koeln.de/fonts/LinuxLibertine/LinLibertine_Rah.ttf'
let linuxLibertineFontBytes = null

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
    this.zoomOutButton = $('#zoom-out-btn')
    this.zoomInButton = $('#zoom-in-btn')
    this.zoomLabel = $('#zoom-label')


    this.canvas = document.getElementById('theCanvas')
    BrowserUtilities.setCanvasHiPDI(this.canvas, Math.round(defaultPageWidth), Math.round(defaultPageHeight))
    this.canvasRenderer = new CanvasRenderer(this.canvas)
    this.__setZoomStep(defaultZoomStep)
    this.textBoxMeasurer = new CanvasTextBoxMeasurer()
    this.currentTypesetDocument = new TypesetterDocument()

    this.pageWidth = defaultPageWidth
    this.pageHeight = defaultPageHeight
    this.marginTop = defaultMarginTop
    this.marginRight = defaultMarginRight
    this.marginBottom = defaultMarginBottom
    this.marginLeft = defaultMarginLeft
    this.lineSkip = defaultLineSkip
    this._setFont(defaultFonts[0], defaultFontSize).then( () => {
      this._setInputFieldsFromCurrentValues()
      this.lastText = this.inputTextArea.val()
      this.__typesetAndRender(this.lastText).then( () => {console.log('First render done')})
    })

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

    this.zoomInButton.on('click', this.__genOnClickZoomButton(true))
    this.zoomOutButton.on('click', this.__genOnClickZoomButton(false))
  }


  async __typesetAndRender(text) {
    let startTime = window.performance.now()
    this.currentTypesetDocument = await this._typesetPlainText(text)
    let typesetEndTime = window.performance.now()
    console.log(`Text typeset in ${typesetEndTime - startTime} ms`)
    await this._render(this.currentTypesetDocument)
    let renderEndTime = window.performance.now()
    console.log(`Rendered in ${renderEndTime - typesetEndTime} ms`)
  }

  getOnChangeInputField() {
    return async () => {
      await this._getDataFromInputFields()
      await this.__typesetAndRender(this.lastText)
    }
  }

  genOnChangeInputText() {
    return async () => {
      let newText = this.inputTextArea.val()
      if (newText !== this.lastText) {
        console.log(`New input text: '${this.inputTextArea.val()}'`)
        this.lastText = newText
        await this.__typesetAndRender(this.lastText)
      }
    }
  }

  __genOnClickZoomButton(zoomIn = true) {
    return () => {
      let newZoomStep
      if (zoomIn) {
        newZoomStep = this.currentZoomStep + 1
      } else {
        newZoomStep = this.currentZoomStep - 1
      }
      if (newZoomStep === zoomSteps.length) {
        // at the end of the scale, do nothing
        return
      }

      if (newZoomStep < 0) {
        return
        // at the other end of the scale, do nothing
      }

      this.__setZoomStep(newZoomStep)

      this.__renderCanvas(this.currentTypesetDocument)
    }
  }

  __setZoomStep(newZoomStep) {
    this.currentZoomStep = newZoomStep
    let newScale = zoomSteps[this.currentZoomStep]
    this.canvasRenderer.setScale(newScale).setPageMargin(defaultCanvasPageMargin*newScale)
    this.zoomLabel.html(`${newScale * 100}%`)
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
    this.lineSkip = this.__getPxDimensionFromInputField('pt', this.lineSkipInput, 12, 72, 24)
    return this._setFont(
      defaultFonts[this.fontFamilyInput.val()],
      this.__getPxDimensionFromInputField('pt', this.fontSizeInput, 8, 36, 12)
    )

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

  async _setFont (fontFamily, fontSize) {
    this.fontFamily = fontFamily
    this.fontSize = fontSize
    let spaceTextBox = TextBoxFactory.simpleText(' ', { fontFamily: this.fontFamily, fontSize: this.fontSize })
    this.normalSpaceWidth = await this.textBoxMeasurer.getBoxWidth(spaceTextBox)
    this.normalSpaceStretch = this.normalSpaceWidth / 6
    this.normalSpaceShrink = this.normalSpaceWidth / 9

  }

  _typesetPlainText(plainText) {
    // one word per line, just to see that the playground is working
    let wordTextBoxes = removeExtraWhiteSpace(plainText).split(' ').map ( (word) => {
      return TextBoxFactory.simpleText(word, { fontFamily: this.fontFamily, fontSize: this.fontSize})
    })
    let paragraphToTypeset = new ItemList(TypesetterItemDirection.HORIZONTAL)
    wordTextBoxes.forEach( (textBox, i) => {
      paragraphToTypeset.pushItem(textBox)
      let glueToken = (new Glue()).setWidth(this.normalSpaceWidth)
        .setStretch(this.normalSpaceStretch)
        .setShrink(this.normalSpaceShrink)
      if (i !== wordTextBoxes.length - 1) {
        paragraphToTypeset.pushItem(glueToken)
      }
    })

    let verticalListToTypeset = new ItemList(TypesetterItemDirection.VERTICAL)
    verticalListToTypeset.pushItem(paragraphToTypeset)

    let ts = new SimpleTypesetter(
      {
        pageWidth: this.pageWidth,
        pageHeight: this.pageHeight,
        marginTop: this.marginTop,
        marginBottom: this.marginBottom,
        marginLeft: this.marginLeft,
        marginRight: this.marginRight,
        lineSkip: this.lineSkip,
        textBoxMeasurer: this.textBoxMeasurer

      })
    return ts.typeset(verticalListToTypeset)
  }

  __renderCanvas(doc) {
    let [ canvasWidth, canvasHeight] = this.canvasRenderer.getCanvasDimensionsForDoc(doc)

    BrowserUtilities.setCanvasHiPDI(this.canvas, canvasWidth, canvasHeight)
    let ctx = this.canvas.getContext('2d')
    ctx.clearRect(0,0, this.canvas.width, this.canvas.height)

    if (doc.getPageCount() === 0) {
      console.log('Nothing to do, no pages to render')
      return
    }
    this.canvasRenderer.renderDocument(doc)
  }

  /**
   *
   * @return {Promise<void>}
   * @private
   * @param {TypesetterDocument}doc
   */
  async _render(doc) {

    let pages = doc.getPages()
    console.log(`Rendering document, ${doc.getPageCount()} pages`)
    console.log(doc)

    $('#docJson').html(JSON.stringify(doc.getExportObject()))

    this.__renderCanvas(doc)
    // PDF render
    const pdfDoc = await PDFLib.PDFDocument.create();
    pdfDoc.registerFontkit(fontkit)
    if (freeSerifFontBytes === null) {
      console.log(`Fetching FreeSerif font`)
      freeSerifFontBytes = await fetch(freeSerifFontUrl).then( res => res.arrayBuffer())
    }
    if (linuxLibertineFontBytes === null) {
      console.log(`Fetching LinuxLibertine font`)
      linuxLibertineFontBytes = await fetch(linuxLibertineFontUrl).then( res => res.arrayBuffer())
    }

    const freeSerifFont = await pdfDoc.embedFont(freeSerifFontBytes, {
      subset: true
    })
    const linuxLibertineFont = await pdfDoc.embedFont(linuxLibertineFontBytes, {
      subset: true
    })

    let fonts = {  'FreeSerif': freeSerifFont, 'Linux Libertine': linuxLibertineFont}

    let pdfRenderer = new PdfRenderer( {
      pdfDocument: pdfDoc,
      fonts: fonts,
      defaultPageHeight: this.pageHeight
    })

    pdfRenderer.renderDocument(this.currentTypesetDocument)
    document.getElementById('pdfFrame').src = await pdfDoc.saveAsBase64({ dataUri: true });

  }
}
