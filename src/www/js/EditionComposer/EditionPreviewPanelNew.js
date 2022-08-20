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
import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'

const defaultIcons = {
  busy: '<i class="fas fa-circle-notch fa-spin"></i>'
}

const canvasId = 'edition-preview-canvas-new'
const downloadPdfButtonId = 'export-pdf-btn-new'

export class EditionPreviewPanelNew extends PanelWithToolbar {

  constructor (options = {}) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object', required: true},
      edition: { type: 'object', objectClass: Edition, required: true},
      langDef: { type: 'object', required: true},
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
    this.ctData = this.options.ctData
    this.edition = this.options.edition

  }

  generateToolbarHtml (tabId, mode, visible) {
    return ` <div class="zoom-controller">
                    </div>
                    <div>
                        <a id="${downloadPdfButtonId}" class="tb-button margin-left-med" href="#" title="Download PDF">
                            <small>PDF</small> <i class="fas fa-download"></i>
                        </a>
                    </div>`
  }


  generateContentHtml (tabId, mode, visible) {
    return `<canvas id="${canvasId}"></canvas>`
  }

  postRender (id, mode, visible) {

    this.downloadPdfButton = $(`#${downloadPdfButtonId}`)
    this.downloadPdfButton.off('click')

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

    this.viewer.render().then( () => {
      this.downloadPdfButton.on('click', this._genOnClickDownloadPdfButton())
      console.log(`Edition rendered`)
      this.onResize()
    })
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

  updateData(ctData, edition) {
    this.verbose && console.log(`Updating data`)
    this.ctData = ctData
    this.edition = edition
    this.updatePreview()
  }

  updatePreview() {
    this.viewer = new EditionViewerCanvas({
      edition: this.edition,
      fontFamily:  this.options.langDef[this.edition.lang].editionFont,
      scale: 1,
      canvasElement: document.getElementById(`${canvasId}`),
      debug: true
    })
    this.viewer.render().then( () => {
      console.log(`Edition rendered again`)
    })
  }

  __genOnZoom() {
    return  (scale) => {
      return new Promise ( (resolve) => {
        this.viewer.setScale(scale).then( () => {
          this.debug && console.log(`Resolving ${scale}`)
          this.onResize()
          resolve(scale)
        })
      })
    }

  }

}