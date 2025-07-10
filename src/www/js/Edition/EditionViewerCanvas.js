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
import { Edition } from './Edition.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { CanvasTextBoxMeasurer } from '../Typesetter2/TextBoxMeasurer/CanvasTextBoxMeasurer.mjs'
import { CanvasRenderer } from '../Typesetter2/Renderer/CanvasRenderer.mjs'
import { BrowserUtilities } from '../toolbox/BrowserUtilities.mjs'
import { Typesetter2 } from '../Typesetter2/Typesetter2.mjs'
import { EditionTypesetting } from './EditionTypesetting.mjs'
import { BasicTypesetter } from '../Typesetter2/BasicTypesetter.mjs'
import { deepCopy, isRtl } from '../toolbox/Util.mjs'
import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'
import { BasicProfiler } from '../toolbox/BasicProfiler.mjs'
import { Dimension } from '../Typesetter2/Dimension.mjs'
import { StyleSheet } from '../Typesetter2/Style/StyleSheet.mjs'

const pageMarginInCanvas = 20

const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)



export class EditionViewerCanvas {

  constructor (options) {

    let oc = new OptionsChecker({
      context: 'EditionViewerCanvas',
      optionsDefinition: {
        edition: { type: 'object', objectClass: Edition, required: true },
        editionStyleSheet: { type: 'object', objectClass: StyleSheet},
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
        lineNumbersFontSizeInPts: { type: 'Number', default: 10},
        resetLineNumbersEachPage: { type: 'boolean', default: false},
        apparatusFontSizeInPts: { type: 'NumberGreaterThanZero', default: 10},
        mainTextLineHeightInPts: { type: 'NumberGreaterThanZero', default: 15},
        apparatusLineHeightInPts: { type: 'NumberGreaterThanZero', default: 12},
        normalSpaceWidthInEms: { type: 'NumberGreaterThanZero', default: 0.33},
        textToLineNumbersInCm: { type: 'NumberGreaterThanZero', default: 0.5},
        textToMarginaliaInCm: { type: 'NumberGreaterThanZero', default: 0.5},
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
      textToMarginalia: Typesetter2.cm2px(this.options.textToMarginaliaInCm),
      textToApparatus: Typesetter2.cm2px(this.options.textToApparatusInCm),
      interApparatus: Typesetter2.cm2px(this.options.interApparatusInCm),
      normalSpaceWidthInEms: this.options.normalSpaceWidthInEms
    }


    this.edition = this.options.edition
    this.canvas = this.options.canvasElement
    this.debug = this.options.debug
    this.canvasRenderer = new CanvasRenderer(this.canvas, this.edition.lang === 'la' ? 'ltr' : 'rtl')
    BrowserUtilities.setCanvasHiPDI(this.canvas, Math.round(this.geometry.pageWidth), Math.round(this.geometry.pageHeight))

    this.canvasRenderer.setScale(this.options.scale).setPageMargin(pageMarginInCanvas)
    this.canvasMeasurer = new CanvasTextBoxMeasurer()
    this.currentScale = this.options.scale;
    this.editionDoc = null
  }

  getTypesettingParameters() {
    return this.typesettingParameters
  }


  render() {
    return new Promise( (resolve) => {
      if (this.editionDoc === null) {
        // need to typeset the edition
        this.__typesetEdition().then( (doc) => {
          this.editionDoc = doc
          // this.debug && console.log(`Edition typeset`)
          // this.debug && console.log(doc)
          this.__renderCanvas(doc)
          resolve()
        })
      } else {
        this.__renderCanvas(this.editionDoc)
        resolve()
      }
    })
  }

  getTypesetEdition(){
    return this.editionDoc
  }

  setScale(newScale) {
    return new Promise ( (resolve) => {
      this.canvasRenderer.setScale(newScale)
      // this.debug && console.log(`Scale set to ${newScale}`)
      this.render().then( () => {
        this.currentScale = newScale;
        resolve(newScale)
      }).catch( (err) => {
        console.error(`Error rendering canvas`)
        console.log(err)
      })
    })
  }

  getCurrentScale() {
    return this.currentScale;
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
    // this.debug && console.log(`Rendering canvas`)
    this.canvasRenderer.renderDocument(doc)
  }


  getMainTextListToTypeset() {
    return this.rawMainTextVerticalListToTypeset
  }


  __typesetEdition() {
    return new Promise( async (resolve) => {
      // reset typesetting data
      this.typesettingParameters = undefined
      let helperOptions = {
        edition: this.edition,
        editionStyleSheet: this.options.editionStyleSheet,
        defaultFontFamily: this.options.fontFamily,
        defaultFontSize: Typesetter2.pt2px(this.options.mainTextFontSizeInPts),
        textBoxMeasurer: this.canvasMeasurer,
        debug: false
      }
      // Load fonts
      console.log(`Loading fonts`)
      let fontsToLoad = []
      this.options.editionStyleSheet.getFontFamilies().forEach( (fontFamily) => {
        fontsToLoad.push(`1em ${fontFamily}`,
          `bold 1em ${fontFamily}`,
          `italic 1em ${fontFamily}`,
          `bold italic 1em ${fontFamily}` )
      })

      for (let i = 0; i < fontsToLoad.length; i++) {
        await document.fonts.load(fontsToLoad[i])
        console.log(` Loaded ${fontsToLoad[i]} `)
      }
      let editionTypesettingHelper = new EditionTypesetting(helperOptions)
      editionTypesettingHelper.setup().then( async () => {
        let verticalListToTypeset = await editionTypesettingHelper.generateListToTypesetFromMainText()
        this.rawMainTextVerticalListToTypeset = verticalListToTypeset.getExportObject()
        this.mainTextVerticalListToTypeset = verticalListToTypeset
        // this.debug && console.log(`List to typeset`)
        // this.debug && console.log(verticalListToTypeset)
        let lineNumbersAlign = 'right'
        let lineNumbersX = this.geometry.margin.left - this.geometry.textToLineNumbers
        let marginaliaX = this.geometry.pageWidth - this.geometry.margin.right + this.geometry.textToMarginalia
        let marginaliaAlign = 'left'
        if (isRtl(this.edition.lang)) {
          lineNumbersAlign = 'left'
          lineNumbersX = this.geometry.pageWidth - this.geometry.margin.right + this.geometry.textToLineNumbers
          marginaliaAlign = 'right'
          marginaliaX = this.geometry.margin.left - this.geometry.textToMarginalia
        }
        this.typesettingParameters = {
          mainTextVerticalListToTypeset: verticalListToTypeset,
          helperOptions: helperOptions,
          typesetterOptions: {
            pageWidth: this.geometry.pageWidth,
            pageHeight: this.geometry.pageHeight,
            marginTop: this.geometry.margin.top,
            marginBottom: this.geometry.margin.bottom,
            marginLeft: this.geometry.margin.left,
            marginRight: this.geometry.margin.right,
            defaultFontFamily: this.options.fontFamily,
            defaultFontSize:  this.geometry.mainTextFontSize,
            lineSkip: this.geometry.mainTextLineHeight,
            apparatusLineSkip: Dimension.pt2px(this.options.apparatusLineHeightInPts),
            textToApparatusGlue:  {
              height: this.geometry.textToApparatus,
              shrink: this.geometry.textToApparatus*0.1,
              stretch: this.geometry.pageHeight - this.geometry.margin.bottom - this.geometry.margin.top
            },
            interApparatusGlue: {
              height: this.geometry.interApparatus,
              shrink: 0,
              stretch: 0
            },
            showPageNumbers: true,
            pageNumbersOptions: {
              fontFamily: this.options.fontFamily,
              fontSize: this.geometry.mainTextFontSize,
              numberStyle: this.edition.lang
            },
            showLineNumbers: true,
            lineNumbersOptions: {
              fontFamily: this.options.fontFamily,
              fontSize: Typesetter2.pt2px(this.options.lineNumbersFontSizeInPts),
              frequency: 5,
              numberStyle: this.edition.lang,
              align: lineNumbersAlign,
              resetEachPage: this.options.resetLineNumbersEachPage,
              xPosition: lineNumbersX
            },
            marginaliaOptions: {
              xPosition: marginaliaX,
              defaultTextDirection: isRtl(this.edition.lang) ? 'rtl' : 'ltr',
              align: marginaliaAlign
            },
            textBoxMeasurer: this.canvasMeasurer,
            getApparatusListToTypeset: (mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine) => {
              return editionTypesettingHelper.generateApparatusVerticalListToTypeset(mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine)
            },
            preTypesetApparatuses: () => {
              editionTypesettingHelper.resetExtractedMetadataInfo()
              return resolvedPromise(true)
            },
            getMarginaliaForLineRange: (lineFrom, lineTo) =>{
              return editionTypesettingHelper.getMarginaliaForLineRange(lineFrom, lineTo)
            },
            debug: false
          },
          extraData: { apparatuses: this.edition.apparatuses}
        }
        let ts = new BasicTypesetter(this.typesettingParameters.typesetterOptions)
        let profiler = new BasicProfiler('Typesetting', true)
        let tsOutput = await ts.typeset(verticalListToTypeset, this.typesettingParameters.extraData)
        profiler.stop('last')
        console.log(`Typeset doc`)
        console.log(tsOutput)
        resolve (tsOutput)
      })
    })
  }

}