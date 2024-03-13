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





import { PanelWithToolbar } from '../MultiPanelUI/PanelWithToolbar'
import { Edition } from '../Edition/Edition.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ZoomController } from '../toolbox/ZoomController'
import { EditionViewerCanvas } from '../Edition/EditionViewerCanvas'
import { resolvedPromise, wait } from '../toolbox/FunctionUtil.mjs'
import { BasicProfiler } from '../toolbox/BasicProfiler.mjs'
import { CanvasTextBoxMeasurer } from '../Typesetter2/TextBoxMeasurer/CanvasTextBoxMeasurer.mjs'
import { Dimension } from '../Typesetter2/Dimension.mjs'
import { SystemStyleSheet } from '../Typesetter2/Style/SystemStyleSheet.mjs'
import { WebStorageKeyCache } from '../toolbox/KeyCache/WebStorageKeyCache'

const defaultIcons = {
  busy: '<i class="fas fa-circle-notch fa-spin"></i>',
  updatePreview: '<i class="bi bi-arrow-counterclockwise"></i>'
}

const canvasId = 'edition-preview-canvas-new'
const downloadPdfButtonId = 'export-pdf-btn-new'

const webCacheDataId = 'epp-20240312.103420';

export class EditionPreviewPanelNew extends PanelWithToolbar {

  constructor (options = {}) {
    super(options);
    let optionsSpec = {
      edition: { type: 'object', objectClass: Edition, required: true},
      langDef: { type: 'object', required: true},
      automaticUpdate: { type: 'boolean', default: false},
      outDatedLabel: { type: 'string', default: '<i class="bi bi-exclamation-triangle-fill"></i> Out-of-date '},
      icons: { type: 'object', default: defaultIcons},
      onEditionTypeset: {type: 'function', default: () => {console.log(`Event triggered: onEditionTypeset`)}},
      getPdfDownloadUrl: {
        type: 'function',
        default: (data) => {
          this.debug && console.log(`Default getPdfDownloadUrl called`)
          this.debug && console.log(data)
          return resolvedPromise('')}
        }
    }
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:  'Edition Preview Panel New'});
    this.options = oc.getCleanOptions(options);
    this.edition = this.options.edition;
    this.measurer = new CanvasTextBoxMeasurer();
    this.webCache = new WebStorageKeyCache('local', webCacheDataId);
    this.cacheKey = this.getStorageKeyFromEdition();
    this.styleSheets = SystemStyleSheet.getStyleSheetsForLanguage(this.edition.lang)
    this.styleSheetIds = Object.keys(this.styleSheets)
    const initialViewSettings = this.webCache.retrieve(this.cacheKey) ?? {
      styleSheetId: this.styleSheetIds[0]
    }
    this.currentStyleSheetId = initialViewSettings.styleSheetId;
    this.currentStyleSheet = SystemStyleSheet.getStyleSheet(this.edition.lang, this.currentStyleSheetId)
  }

  /**
   * Returns a string that identifies the edition for the
   * purposes of saving data in web storages.
   * @return {string}
   * @private
   */
  getStorageKeyFromEdition() {
    if (this.edition.info.singleChunk) {
      return `ct-${this.edition.info.tableId}`;
    } else {
      return `multiChunk-${this.edition.info.editionId}`
    }
  }

  /**
   * @private
   */
  reloadStyleSheets() {
    this.styleSheets = SystemStyleSheet.getStyleSheetsForLanguage(this.edition.lang)
    this.styleSheetIds = Object.keys(this.styleSheets)
    this.currentStyleSheet = SystemStyleSheet.getStyleSheet(this.edition.lang, this.currentStyleSheetId)
  }

  generateToolbarHtml (tabId, mode, visible) {
    return `<div class="styles-div"></div>
        <div class="zoom-controller"></div>
        <div>
            <button class="tb-button update-preview-btn" title="Not showing latest version, click to update">${this.options.outDatedLabel} ${this.options.icons.updatePreview}</button>
        </div>
        <div>
            <button id="${downloadPdfButtonId}" class="tb-button margin-left-med" title="Download PDF">
                <small>PDF</small> <i class="fas fa-download"></i>
            </button>
        </div>`
  }


  async generateContentHtml (tabId, mode, visible) {
    return `<canvas id="${canvasId}"></canvas>`
  }

  postRender (id, mode, visible) {

    this.downloadPdfButton = $(`#${downloadPdfButtonId}`)
    this.downloadPdfButton
      .off('click')
      .on('click', this._genOnClickDownloadPdfButton())
      .addClass('hidden')

    this.updatePreviewButton = $(`${this.containerSelector} .update-preview-btn`)
    if (this.options.automaticUpdate) {
      this.updatePreviewButton.addClass('hidden')
    }

    this.updatePreviewButton.on('click', () => {
        this.updatePreview()
    })

    this.viewer = new EditionViewerCanvas(this.__getViewerOptions())
    this.zoomController = new ZoomController({
      containerSelector: `${this.containerSelector} div.zoom-controller`,
      onZoom: this.__genOnZoom(),
      debug: false
    })
    this.setupStyleSelector()
    if (this.options.automaticUpdate) {
      this.updatePreview()
    }
  }


  setupStyleSelector(){
    $(`${this.containerSelector} div.styles-div`).html(this.genStyleDropdownHtml(this.currentStyleSheetId))
    this.styleSelect = $('#style-select')
    this.styleSelect.on("change", () => {
      console.log(`Current option: '${this.styleSelect.val()}'`)
      this.currentStyleSheetId = this.styleSelect.val().toString()
      this.currentStyleSheet = SystemStyleSheet.getStyleSheet(this.edition.lang, this.currentStyleSheetId)
      this.webCache.store(this.cacheKey, {
        styleSheetId: this.currentStyleSheetId
      })
      this.updatePreviewButton.removeClass('hidden')
    })
  }

  /**
   * @param {string} currentStyleId
   * @return {string}
   * @private
   */
  genStyleDropdownHtml(currentStyleId) {
    let optionsHtml = this.styleSheetIds.map( (styleId) => {
      let selected = styleId === currentStyleId ? 'selected' : '';
      return `<option value="${styleId}" ${selected}>${this.styleSheets[styleId]['_metaData']['name']}`;
    }).join('');

    return `<label for="style-select">Style:</label><select name="style" id="style-select">
        ${optionsHtml}
    </select>`;
  }

  __getViewerOptions(initialScale = 1) {
    // for now, just use the first stylesheet
    let strings = this.currentStyleSheet.getStrings()
    let defaultStyleDef = this.currentStyleSheet.getStyleDef('default')
    let apparatusStyleDef = this.currentStyleSheet.getStyleDef('apparatus')
    let defaultFontSize = Dimension.str2px(defaultStyleDef.text.fontSize)
    if (defaultFontSize === 0) {
      console.warn(`Default font size is not well defined in stylesheet: '${defaultStyleDef.text.fontSize}'`)
      defaultFontSize = 16
    }
    let apparatusFontSize =  Dimension.str2px(apparatusStyleDef.text.fontSize, defaultFontSize)
    if (apparatusFontSize === 0) {
      console.warn(`Apparatus font size is not well defined in stylesheet: '${this.currentStyleSheet.getStyleDef('apparatus').text.fontSize}'`)
      apparatusFontSize = 14
    }
    // this.debug && console.log(`Main text font size: ${defaultFontSize}; apparatus font size: ${apparatusFontSize}`)
    // console.log('Default Style def')
    // console.log(defaultStyleDef)
    return {
      edition: this.edition,
      editionStyleSheet: this.currentStyleSheet,
      canvasElement: document.getElementById(`${canvasId}`),
      fontFamily:  defaultStyleDef.text.fontFamily,
      scale: initialScale,
      entrySeparator: strings['entrySeparator'],
      apparatusLineSeparator: strings['lineRangeSeparator'],
      pageWidthInCm: Dimension.str2cm(defaultStyleDef.page.width, defaultFontSize),
      pageHeightInCm:  Dimension.str2cm(defaultStyleDef.page.height,defaultFontSize),
      marginInCm: {
        top: Dimension.str2cm(defaultStyleDef.page.marginTop,defaultFontSize),
        left: Dimension.str2cm(defaultStyleDef.page.marginLeft,defaultFontSize),
        bottom: Dimension.str2cm(defaultStyleDef.page.marginBottom,defaultFontSize),
        right: Dimension.str2cm(defaultStyleDef.page.marginRight,defaultFontSize),
      },
      mainTextFontSizeInPts: Dimension.px2pt(defaultFontSize),
      lineNumbersFontSizeInPts: Dimension.str2pt(defaultStyleDef.page.lineNumbersFontSize, defaultFontSize),
      resetLineNumbersEachPage: defaultStyleDef.page.resetLineNumbersEachPage,
      apparatusFontSizeInPts: Dimension.px2pt(apparatusFontSize),
      mainTextLineHeightInPts: Dimension.str2pt(defaultStyleDef.paragraph.lineSkip, defaultFontSize),
      apparatusLineHeightInPts: Dimension.str2pt(apparatusStyleDef.paragraph.lineSkip, apparatusFontSize),
      normalSpaceWidthInEms: 0.25,  // TODO: Check usages and change to glue
      textToLineNumbersInCm: Dimension.str2cm(defaultStyleDef.page.lineNumbersToTextDistance, defaultFontSize),
      textToApparatusInCm: Dimension.str2cm(defaultStyleDef.page.minDistanceFromApparatusToText),
      interApparatusInCm: Dimension.str2cm(defaultStyleDef.page.minInterApparatusDistance),
      debug: true
    }
  }

  _genOnClickDownloadPdfButton() {
    return () => {
      let typesettingParameters = this.viewer.getTypesettingParameters()
      if (typesettingParameters === undefined) {
        console.log(`Edition typesetting not ready yet`)
        return
      }
      // delete browser specific options, these will
      // be set by the server-side process

      typesettingParameters.typesetterOptions.textBoxMeasurer = undefined
      typesettingParameters.typesetterOptions.getApparatusListToTypeset = undefined
      typesettingParameters.typesetterOptions.preTypesetApparatuses = undefined
      typesettingParameters.helperOptions.textBoxMeasurer = undefined
      typesettingParameters.helperOptions.styleId = this.currentStyleSheetId

      let data = {
        options: typesettingParameters.typesetterOptions,
        helperOptions: typesettingParameters.helperOptions,
        mainTextList: this.viewer.getMainTextListToTypeset(),
        extraData: typesettingParameters.extraData
      }
      console.log(`About to call PDF API with the following data:`)
      console.log(data)
      let currentButtonHtml = this.downloadPdfButton.html()
      this.downloadPdfButton.html(`Waiting for server's PDF... ${this.options.icons.busy}`)
      this.options.getPdfDownloadUrl(data).then( (url) => {
        this.debug && console.log(`PDF download URL: ${url}`)
        this.downloadPdfButton.html(currentButtonHtml)
        if (url !== undefined && url !== '') {
          window.open(url)
        }
      }).catch( () => {
        console.log('PDF export error')
      })

    }
  }

  updateData(edition) {
    this.verbose && console.log(`Updating data`);
    // this.ctData = ctData
    this.edition = edition;
    this.cacheKey = this.getStorageKeyFromEdition();
    const savedViewSettings = this.webCache.retrieve(this.cacheKey) ?? {
      styleSheetId: this.styleSheetIds[0]
    }
    this.currentStyleSheetId = savedViewSettings.styleSheetId;
    this.reloadStyleSheets();
    this.setupStyleSelector();
    if (this.options.automaticUpdate) {
      this.updatePreview();
    } else {
      this.updatePreviewButton.removeClass('hidden');
    }
  }

  updatePreview() {
    let currentButtonHtml = this.updatePreviewButton.html()
    this.updatePreviewButton.html(`Updating preview... ${this.options.icons.busy}`);
    // wait for browser to update toolbar span and button
    wait(100).then( () => {
      let profiler = new BasicProfiler('Update preview')
      profiler.start();
      this.viewer = new EditionViewerCanvas(this.__getViewerOptions(this.viewer.getCurrentScale()));
      this.viewer.render().then( () => {
        profiler.stop()
        this.updatePreviewButton.html(currentButtonHtml).addClass('hidden')
        this.downloadPdfButton.removeClass('hidden')
        console.log(`Edition rendered`)
        this.options.onEditionTypeset(this.viewer.getTypesetEdition())
        this.onResize(true)
      })
    })
  }

  __genOnZoom() {
    return (scale) => {
      return new Promise ( (resolve) => {
        this.viewer.setScale(scale).then( () => {
          // this.debug && console.log(`Resolving ${scale}`)
          this.onResize()
          resolve(scale)
        })
      })
    }

  }

}