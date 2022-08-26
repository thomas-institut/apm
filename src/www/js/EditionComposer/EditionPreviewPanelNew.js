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

const defaultIcons = {
  busy: '<i class="fas fa-circle-notch fa-spin"></i>',
  updatePreview: '<i class="bi bi-arrow-counterclockwise"></i>'
}

const canvasId = 'edition-preview-canvas-new'
const downloadPdfButtonId = 'export-pdf-btn-new'

export class EditionPreviewPanelNew extends PanelWithToolbar {

  constructor (options = {}) {
    super(options)
    let optionsSpec = {
      // ctData: { type: 'object', required: true},
      edition: { type: 'object', objectClass: Edition, required: true},
      langDef: { type: 'object', required: true},
      automaticUpdate: { type: 'boolean', default: false},
      outDatedLabel: { type: 'string', default: '<i class="bi bi-exclamation-triangle-fill"></i> Out-of-date '},
      icons: { type: 'object', default: defaultIcons},
      //
      getPdfDownloadUrl: {
        type: 'function',
        default: (data) => {
          this.debug && console.log(`Default getPdfDownloadUrl called`)
          this.debug && console.log(data)
          return resolvedPromise('')}
        }
    }
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:  'Edition Preview Panel New'})
    this.options = oc.getCleanOptions(options)
    // this.ctData = this.options.ctData
    this.edition = this.options.edition

  }

  generateToolbarHtml (tabId, mode, visible) {
    return `<div class="zoom-controller">
        </div>
        <div>
            <button class="tb-button update-preview-btn" title="Not showing latest version, click to update">${this.options.outDatedLabel} ${this.options.icons.updatePreview}</button>
        </div>
        <div>
            <button id="${downloadPdfButtonId}" class="tb-button margin-left-med" title="Download PDF">
                <small>PDF</small> <i class="fas fa-download"></i>
            </button>
        </div>`
  }


  generateContentHtml (tabId, mode, visible) {
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

    this.viewer = new EditionViewerCanvas({
          edition: this.edition,
          fontFamily:  this.options.langDef[this.edition.lang].editionFont,
          scale: 1,
          canvasElement: document.getElementById(`${canvasId}`),
          debug: true
    })


    this.zoomController = new ZoomController({
      containerSelector: `${this.containerSelector} div.zoom-controller`,
      onZoom: this.__genOnZoom(),
      debug: false
    })

    if (this.options.automaticUpdate) {
      this.updatePreview()
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

      let data = {
        options: typesettingParameters.typesetterOptions,
        helperOptions: typesettingParameters.helperOptions,
        mainTextList: typesettingParameters.mainTextVerticalListToTypeset.getExportObject(),
        extraData: typesettingParameters.extraData
      }
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
    this.verbose && console.log(`Updating data`)
    // this.ctData = ctData
    this.edition = edition
    if (this.options.automaticUpdate) {
      this.updatePreview()
    } else {
      this.updatePreviewButton.removeClass('hidden')
    }
  }

  updatePreview() {
    let currentButtonHtml = this.updatePreviewButton.html()
    this.updatePreviewButton.html(`Updating preview... ${this.options.icons.busy}`)
    // wait for browser to update toolbar span and button
    wait(100).then( () => {
      let profiler = new BasicProfiler('Update preview')
      profiler.start()
      this.viewer = new EditionViewerCanvas({
        edition: this.edition,
        fontFamily:  this.options.langDef[this.edition.lang].editionFont,
        scale: 1,
        canvasElement: document.getElementById(`${canvasId}`),
        debug: true
      })
      this.viewer.render().then( () => {
        profiler.stop()
        this.updatePreviewButton.html(currentButtonHtml).addClass('hidden')
        this.downloadPdfButton.removeClass('hidden')
        console.log(`Edition rendered`)
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