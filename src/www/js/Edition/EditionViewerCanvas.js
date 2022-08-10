/*
 *  Copyright (C) 2022 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */
import { Edition } from './Edition'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { CanvasTextBoxMeasurer } from '../Typesetter2/TextBoxMeasurer/CanvasTextBoxMeasurer.mjs'
import { CanvasRenderer } from '../Typesetter2/Renderer/CanvasRenderer.mjs'
import { BrowserUtilities } from '../toolbox/BrowserUtilities.mjs'
import { Typesetter2 } from '../Typesetter2/Typesetter2.mjs'
import { EditionTypesetting } from './EditionTypesetting'
import { BasicTypesetter } from '../Typesetter2/BasicTypesetter.mjs'
import { isRtl } from '../toolbox/Util.mjs'

const pageMarginInCanvas = 20

const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)



export class EditionViewerCanvas {

  constructor (options) {

    let oc = new OptionsChecker({
      context: 'EditionViewerCanvas',
      optionsDefinition: {
        edition: { type: 'object', objectClass: Edition, required: true },
        canvasElement: { type: 'object', required: true},
        fontFamily:  { type: 'NonEmptyString', required: true},
        scale: { type: 'number', default: 1},
        entrySeparator: { type: 'string', default: verticalLine},
        apparatusLineSeparator: { type: 'string', default: doubleVerticalLine},
        pageWidthInCm: { type: 'NumberGreaterThanZero', default: 21},
        pageHeightInCm: { type: 'NumberGreaterThanZero', default: 29.7},
        marginInCm: {type: 'object', default: {
            top: 2,
            left: 3,
            bottom: 2,
            right: 3
          }},
        mainTextFontSizeInPts: { type: 'NumberGreaterThanZero', default: 12},
        lineNumbersFontSizeMultiplier: { type: 'NumberGreaterThanZero', default: 0.8},
        apparatusFontSizeInPts: { type: 'NumberGreaterThanZero', default: 10},
        mainTextLineHeightInPts: { type: 'NumberGreaterThanZero', default: 15},
        apparatusLineHeightInPts: { type: 'NumberGreaterThanZero', default: 12},
        normalSpaceWidthInEms: { type: 'NumberGreaterThanZero', default: 0.33},
        textToLineNumbersInCm: { type: 'NumberGreaterThanZero', default: 0.5},
        textToApparatusInCm: { type: 'NumberGreaterThanZero', default: 1.5},
        interApparatusInCm: { type: 'NumberGreaterThanZero', default: 0.5},
        debug: {type: 'boolean', default: false}
      }
    })
    this.options = oc.getCleanOptions(options)

    this.geometry = {
      pageWidth: Typesetter2.cm2px(this.options.pageWidthInCm),
      pageHeight: Typesetter2.cm2px(this.options.pageHeightInCm),
      lineWidth: Typesetter2.cm2px(this.options.pageWidthInCm -
        this.options.marginInCm.left - this.options.marginInCm.right),
      mainTextLineHeight: Typesetter2.pt2px(this.options.mainTextLineHeightInPts),
      mainTextFontSize: Typesetter2.pt2px(this.options.mainTextFontSizeInPts),
      apparatusLineHeight: Typesetter2.pt2px(this.options.apparatusLineHeightInPts),
      apparatusFontSize: Typesetter2.pt2px(this.options.apparatusFontSizeInPts),
      margin: {
        top: Typesetter2.cm2px(this.options.marginInCm.top),
        left: Typesetter2.cm2px(this.options.marginInCm.left),
        bottom: Typesetter2.cm2px(this.options.marginInCm.bottom),
        right: Typesetter2.cm2px(this.options.marginInCm.right)
      },
      textToLineNumbers: Typesetter2.cm2px(this.options.textToLineNumbersInCm),
      textToApparatus: Typesetter2.cm2px(this.options.textToApparatusInCm),
      interApparatus: Typesetter2.cm2px(this.options.interApparatusInCm),
      normalSpaceWidthInEms: this.options.normalSpaceWidthInEms
    }

    this.edition = this.options.edition
    this.canvas = this.options.canvasElement
    this.debug = this.options.debug
    this.canvasRenderer = new CanvasRenderer(this.canvas)

    this.debug && console.log(`Options`)
    this.debug && console.log(this.options)
    this.debug && console.log(`Geometry`)
    this.debug && console.log(this.geometry)

    BrowserUtilities.setCanvasHiPDI(this.canvas, Math.round(this.geometry.pageWidth), Math.round(this.geometry.pageHeight))
    this.canvasRenderer.setScale(this.options.scale).setPageMargin(pageMarginInCanvas)
    this.canvasMeasurer = new CanvasTextBoxMeasurer()
    this.editionDoc = null
  }


  render() {
    return new Promise( (resolve) => {
      if (this.editionDoc === null) {
        // need to typeset the edition
        this.__typesetEdition().then( (doc) => {
          this.editionDoc = doc
          this.debug && console.log(`Edition typeset`)
          this.debug && console.log(doc)
          this.__renderCanvas(doc)
          resolve()
        })
      } else {
        this.__renderCanvas(this.editionDoc)
        resolve()
      }
    })
  }

  setScale(newScale) {
    return new Promise ( (resolve) => {
      this.canvasRenderer.setScale(newScale)
      this.debug && console.log(`Scale set to ${newScale}`)
      this.render().then( () => {
        resolve(newScale)
      })
    })
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




  __typesetEdition() {
    return new Promise( (resolve) => {
      let editionTypesettingHelper = new EditionTypesetting({
        lang: this.edition.lang,
        defaultFontFamily: this.options.fontFamily,
        defaultFontSize: Typesetter2.pt2px(this.options.mainTextFontSizeInPts),
        textBoxMeasurer: this.canvasMeasurer,
        debug: true
      })
      editionTypesettingHelper.setup().then( () => {
        let verticalListToTypeset = editionTypesettingHelper.generateListToTypesetFromMainText(this.edition)
        this.debug && console.log(`List to typeset`)
        this.debug && console.log(verticalListToTypeset)
        let lineNumbersAlign = 'right'
        let lineNumbersX = this.geometry.margin.left - this.geometry.textToLineNumbers
        if (isRtl(this.edition.lang)) {
          lineNumbersAlign = 'left'
          lineNumbersX = this.geometry.pageWidth - this.geometry.margin.right + this.geometry.textToLineNumbers
        }

        let ts = new BasicTypesetter({
          pageWidth: this.geometry.pageWidth,
          pageHeight: this.geometry.pageHeight,
          marginTop: this.geometry.margin.top,
          marginBottom: this.geometry.margin.bottom,
          marginLeft: this.geometry.margin.left,
          marginRight: this.geometry.margin.right,
          defaultFontFamily: this.options.fontFamily,
          defaultFontSize:  this.geometry.mainTextFontSize,
          lineSkip: this.geometry.mainTextLineHeight,
          showPageNumbers: true,
          pageNumbersOptions: {
            fontFamily: this.options.fontFamily,
            fontSize: this.geometry.mainTextFontSize,
            numberStyle: this.edition.lang
          },
          showLineNumbers: true,
          lineNumbersOptions: {
            fontFamily: this.options.fontFamily,
            fontSize: this.geometry.mainTextFontSize*this.options.lineNumbersFontSizeMultiplier,
            frequency: 5,
            numberStyle: this.edition.lang,
            align: lineNumbersAlign,
            xPosition: lineNumbersX
          },
          textBoxMeasurer: this.canvasMeasurer,
          debug: true
        })
        resolve (ts.typeset(verticalListToTypeset))
      })
    })
  }

}