/*
  Small app to test (and develop) the capabilities of the (new) Typesetter2

  created: 21 Mar 2022
 */

import { TextBoxFactory } from '../../../js/Typesetter2/TextBoxFactory.mjs'
import { BrowserUtilities } from '../../../js/toolbox/BrowserUtilities.mjs'
import { CanvasTextBoxMeasurer } from '../../../js/Typesetter2/CanvasTextBoxMeasurer.mjs'
import { removeExtraWhiteSpace, trimWhiteSpace } from '../../../js/toolbox/Util.mjs'
import { Glue } from '../../../js/Typesetter2/Glue.mjs'
import { Typesetter2 } from '../../../js/Typesetter2/Typesetter2.mjs'
import { SimpleTypesetter } from '../../../js/Typesetter2/SimpleTypesetter.mjs'
import { ItemList } from '../../../js/Typesetter2/ItemList.mjs'
import * as TypesetterItemDirection from '../../../js/Typesetter2/TypesetterItemDirection.mjs'
import { CanvasRenderer } from '../../../js/Typesetter2/CanvasRenderer.mjs'
// import * as PDFLib from 'pdf-lib'
// import fontkit from '@pdf-lib/fontkit'
// import { PdfRenderer } from '../../../js/Typesetter2/PdfRenderer.mjs'
import { TypesetterDocument } from '../../../js/Typesetter2/TypesetterDocument.mjs'
import { TextBox } from '../../../js/Typesetter2/TextBox.mjs'
import { Box } from '../../../js/Typesetter2/Box.mjs'

const defaultPageWidth = Typesetter2.cm2px(14.8)
const defaultPageHeight  = Typesetter2.cm2px(21)

const defaultMarginTop = Typesetter2.cm2px(1)
const defaultMarginLeft = Typesetter2.cm2px(1)
const defaultMarginBottom = Typesetter2.cm2px(1)
const defaultMarginRight = Typesetter2.cm2px(1)

const sampleText = `This is a test.

This is another paragraph.`


const apmBaseUrl = 'http://localhost:8888'

const defaultFonts = [ 'FreeSerif', 'Arial', 'GentiumBasic', 'Linux Libertine']

const defaultFontSize = Typesetter2.pt2px(12)
const defaultLineSkip = Typesetter2.pt2px(18)
const defaultParSkip = 0

const zoomSteps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4]
const defaultZoomStep = 3

const defaultCanvasPageMargin = 20

// const freeSerifFontUrl = 'https://averroes.uni-koeln.de/fonts/freefont/FreeSerif.ttf'
// let freeSerifFontBytes = null
//
// const linuxLibertineFontUrl = 'https://averroes.uni-koeln.de/fonts/LinuxLibertine/LinLibertine_Rah.ttf'
// let linuxLibertineFontBytes = null

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
    this.parSkipInput = $('#parSkip')
    this.zoomOutButton = $('#zoom-out-btn')
    this.zoomInButton = $('#zoom-in-btn')
    this.zoomLabel = $('#zoom-label')

    this.typesetButton = $('#typeset-btn')


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
    this.parSkip = defaultParSkip
    this._setFont(defaultFonts[0], defaultFontSize).then( () => {
      this._setInputFieldsFromCurrentValues()
      this.lastText = this.inputTextArea.val()
      this.__typesetAndRender(this.lastText).then( () => {console.log('First render done')})
    })

    this.typesetButton.on('click', this.genOnClickTypesetButton())
    this.marginTopInput.on('change', this.getOnChangeInputField())
    this.marginBottomInput.on('change', this.getOnChangeInputField())
    this.marginLeftInput.on('change', this.getOnChangeInputField())
    this.marginRightInput.on('change', this.getOnChangeInputField())
    this.pageWidthInput.on('change', this.getOnChangeInputField())
    this.pageHeightInput.on('change', this.getOnChangeInputField())
    this.fontFamilyInput.on('change', this.getOnChangeInputField())
    this.fontSizeInput.on('change', this.getOnChangeInputField())
    this.lineSkipInput.on('change', this.getOnChangeInputField())
    this.parSkipInput.on('change', this.getOnChangeInputField())

    this.zoomInButton.on('click', this.__genOnClickZoomButton(true))
    this.zoomOutButton.on('click', this.__genOnClickZoomButton(false))

    this.urlGenerator = new ApmUrlGenerator(apmBaseUrl)
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
    }
  }

  genOnClickTypesetButton() {
    return async () => {
      this.lastText = this.inputTextArea.val()
      await this._getDataFromInputFields()
      await this.__typesetAndRender(this.lastText)
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
    this.parSkipInput.val(Typesetter2.px2pt(this.parSkip))
  }

  _getDataFromInputFields() {
    this.pageWidth = this.__getPxDimensionFromInputField('cm', this.pageWidthInput, 100, 1000, defaultPageWidth)
    this.pageHeight = this.__getPxDimensionFromInputField('cm',this.pageHeightInput, 100, 2000, defaultPageHeight)
    this.marginTop = this.__getPxDimensionFromInputField('cm',this.marginTopInput, 0, this.pageHeight/2, defaultMarginTop)
    this.marginBottom = this.__getPxDimensionFromInputField('cm',this.marginBottomInput, 0, this.pageHeight/2, defaultMarginBottom)
    this.marginLeft = this.__getPxDimensionFromInputField('cm',this.marginLeftInput, 0, this.pageWidth/2, defaultMarginLeft)
    this.marginRight = this.__getPxDimensionFromInputField('cm',this.marginRightInput, 0, this.pageWidth/2, defaultMarginRight)
    this.lineSkip = this.__getPxDimensionFromInputField('pt', this.lineSkipInput, 12, 72, 24)
    this.parSkip = this.__getPxDimensionFromInputField('pt', this.parSkipInput, 0, 72, 0)
    return this._setFont(
      defaultFonts[this.fontFamilyInput.val()],
      this.__getPxDimensionFromInputField('pt', this.fontSizeInput, 8, 48, 12)
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

  /**
   *
   * @param {string}plainText
   * @private
   */
  __parsePlainText(plainText) {

    console.log(`Parsing plain text`)
    let paragraphTextArray = trimWhiteSpace(plainText)
      .split("\n\n")
      .map( (rawParText) => {
        return removeExtraWhiteSpace(rawParText)
      })
      .filter( (parText) => {
        return parText !== ''
      })
    console.log(`${paragraphTextArray.length} paragraph(s) detected`)
    let parsedPars = paragraphTextArray.map( (text) => { return this.__parseParagraph(text)})
    console.log(parsedPars)
    let ptt = parsedPars.map ( (parsedPar) => {
      let paragraphToTypeset = new ItemList(TypesetterItemDirection.HORIZONTAL)
      paragraphToTypeset.pushItem( (new Box()).setWidth(this.normalSpaceWidth*3)) // indent
      parsedPar.forEach( (cmdObject) => {
        switch(cmdObject['cmd']) {
          case 'text':
            paragraphToTypeset.pushItemArray(this.__getItemsToTypesetFromString(cmdObject['arg']))
            break

          case 'b':
          case 'i':
          case 'bi':
          case 'ib':

            let cleanArg = trimWhiteSpace(cmdObject['arg'])
            if (cleanArg !== '' ) {
              let items = this.__getItemsToTypesetFromString(cleanArg)
              items = items.map( (item) => {
                if (item instanceof TextBox) {
                  switch (cmdObject['cmd']){
                    case 'b':
                      item.setFontWeight('bold')
                      break

                    case 'i':
                      item.setFontStyle('italic')
                      break

                    case 'bi':
                    case 'ib':
                      item.setFontWeight('bold').setFontStyle('italic')
                      break
                  }
                }
                return item
              })
              paragraphToTypeset.pushItemArray(items)
            }
            break


        }
      })
      return paragraphToTypeset
    })


    console.log('Paragraphs to typeset')
    console.log(ptt)
    let verticalListToTypeset = new ItemList(TypesetterItemDirection.VERTICAL)
    ptt.forEach( (parToTypeset) => {
      verticalListToTypeset.pushItem(parToTypeset)
      if (this.parSkip > 0) {
        verticalListToTypeset.pushItem( (new Glue(TypesetterItemDirection.VERTICAL)).setHeight(this.parSkip))
      }
    })
    return verticalListToTypeset
  }

  __getItemsToTypesetFromString(str) {
    let curWord = ''
    let state = 0
    let items = []
    str.split('').forEach( (ch) => {
      switch(state) {
        case 0:
          if (ch === ' ') {
            if (curWord !== '') {
              items.push(TextBoxFactory.simpleText(curWord, { fontFamily: this.fontFamily, fontSize: this.fontSize}))
              curWord = ''
            }
            state = 1
          } else {
            curWord += ch
          }
          break

        case 1:
          if (ch !== ' ') {
            let glueToken = (new Glue()).setWidth(this.normalSpaceWidth)
              .setStretch(this.normalSpaceStretch)
              .setShrink(this.normalSpaceShrink)
            items.push(glueToken)
            curWord = ch
            state = 0
          }
          break
      }
    })
    if (state === 0 && curWord !== '') {
      items.push(TextBoxFactory.simpleText(curWord, { fontFamily: this.fontFamily, fontSize: this.fontSize}))
    }
    if (state === 1) {
      let glueToken = (new Glue()).setWidth(this.normalSpaceWidth)
        .setStretch(this.normalSpaceStretch)
        .setShrink(this.normalSpaceShrink)
      items.push(glueToken)
    }
    return items
  }

  __parseParagraph(text) {
    const escapedCharacters = '\\{}'
    let state = 0
    let commands = []
    let curStr = ''
    let curCmd = ''
    text.split('').forEach( (ch) => {
      switch(state) {
        case 0:
          if (ch === '\\') {
            state = 1
            return
          }
          if (ch === '{') {
            if (curStr !== '') {
              commands.push( { cmd: 'text', arg: curStr})
              curStr = ''
            }
            state = 2
            return
          }
          // other characters
          curStr += ch
          break

        case 1:
          if (escapedCharacters.indexOf(ch) !== -1) {
            curStr += ch
          }
          state = 0
          break

        case 2:
          if (ch === ' ' && curStr !== '') {
            curCmd = curStr
            curStr = ''
            state = 3
            return
          }
          if (ch === '}') {
            if (curStr !== '') {
              commands.push( { cmd: curStr, arg: ''})
              curStr = ''
              curCmd = ''
              state = 0
              return
            }
          }
          curStr += ch
          break

        case 3:
          if (ch === '\\') {
            state = 4
            return
          }
          if (ch === '}') {
            commands.push( { cmd: curCmd, arg: curStr})
            curStr = ''
            curCmd = ''
            state = 0
            return
          }
          // other characters
          curStr += ch
          break

        case 4:
          if (escapedCharacters.indexOf(ch) !== -1) {
            curStr += ch
          }
          state = 3
          break
      }
    })
    if (state === 0 && curStr !== '') {
      commands.push( { cmd: 'text', arg: curStr})
    }
    return commands
  }

  /**
   *
   * @param {string}plainText
   * @returns {Promise}
   * @private
   */
  _typesetPlainText(plainText) {
    let verticalListToTypeset = this.__parsePlainText(plainText)
    let typesetterOptions = {
      pageWidth: this.pageWidth,
      pageHeight: this.pageHeight,
      marginTop: this.marginTop,
      marginBottom: this.marginBottom,
      marginLeft: this.marginLeft,
      marginRight: this.marginRight,
      lineSkip: this.lineSkip,
    }
    $('#docJsonToTypeset').html(JSON.stringify({
      options: typesetterOptions,
      mainTextList: verticalListToTypeset.getExportObject()
    }))
    typesetterOptions.textBoxMeasurer =  this.textBoxMeasurer
    let ts = new SimpleTypesetter(typesetterOptions)
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

    // let pages = doc.getPages()
    console.log(`Rendering document, ${doc.getPageCount()} pages`)

    let jsonData = JSON.stringify(doc.getExportObject())

    $('#docJson').html(jsonData)

    this.__renderCanvas(doc)

    let startTime = window.performance.now()
    let pdfUrl = await  this.__getPdfDownloadURLFromServer(jsonData)
    let endTime = window.performance.now()
    console.log(`PDF rendered in server in ${endTime-startTime}ms`)
    console.log(pdfUrl)


    // PDF render
    // const pdfDoc = await PDFLib.PDFDocument.create();
    // pdfDoc.registerFontkit(fontkit)
    // if (freeSerifFontBytes === null) {
    //   console.log(`Fetching FreeSerif font`)
    //   freeSerifFontBytes = await fetch(freeSerifFontUrl).then( res => res.arrayBuffer())
    // }
    // if (linuxLibertineFontBytes === null) {
    //   console.log(`Fetching LinuxLibertine font`)
    //   linuxLibertineFontBytes = await fetch(linuxLibertineFontUrl).then( res => res.arrayBuffer())
    // }
    //
    // const freeSerifFont = await pdfDoc.embedFont(freeSerifFontBytes, {
    //   subset: true
    // })
    // const linuxLibertineFont = await pdfDoc.embedFont(linuxLibertineFontBytes, {
    //   subset: true
    // })
    //
    // let fonts = {  'FreeSerif': freeSerifFont, 'Linux Libertine': linuxLibertineFont}
    //
    // let pdfRenderer = new PdfRenderer( {
    //   pdfDocument: pdfDoc,
    //   fonts: fonts,
    //   defaultPageHeight: this.pageHeight
    // })
    //
    // pdfRenderer.renderDocument(this.currentTypesetDocument)
    // document.getElementById('pdfFrame').src = await pdfDoc.saveAsBase64({ dataUri: true });

  }

  __getPdfDownloadURLFromServer(jsonData) {

    let apiUrl = this.urlGenerator.apiConvertTypesetterData()

    return new Promise( (resolve, reject) => {
      if (jsonData === '') {
        console.log('No data for PDF export')
        resolve('')
      }
      console.log(`Calling export PDF API at ${apiUrl}`)
      $.post(
        apiUrl,
        {data: JSON.stringify({
            pdfId: `ts-playground`,
            noCache: true,
            typesetterData: jsonData
          })}
      ).done(
        apiResponse => {
          resolve(apiResponse.url)
        }
      ).fail (
        error => {
          console.error('PDF API error')
          console.log(error)
          reject()
        }
      )
    })
  }
}
