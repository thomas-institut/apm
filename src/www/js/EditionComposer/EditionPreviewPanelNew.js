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





import { PanelWithToolbar } from './PanelWithToolbar'
import { Edition } from '../Edition/Edition'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ZoomController } from '../toolbox/ZoomController'
import { EditionViewerCanvas } from '../Edition/EditionViewerCanvas'

const defaultIcons = {
  busy: '<i class="fas fa-circle-notch fa-spin"></i>'
}

const canvasIdPrefix = 'edition-preview-canvas-'
const exportPdfButtonId = 'export-pdf-btn-new'

export class EditionPreviewPanelNew extends PanelWithToolbar {

  constructor (options = {}) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object', required: true},
      edition: { type: 'object', objectClass: Edition, required: true},
      apparatus: { type: 'object', default: []},
      langDef: { type: 'object', required: true},
      icons: { type: 'object', default: defaultIcons}
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
                        <a id="${exportPdfButtonId}" class="tb-button margin-left-med" href="#" download="apm-edition-preview.pdf"
                           title="Download PDF"><small>PDF</small> <i class="fas fa-download"></i></a>
                    </div>`
  }


  generateContentHtml (tabId, mode, visible) {
    return `<canvas id="${canvasIdPrefix}${tabId}"></canvas>`
  }

  postRender (id, mode, visible) {

    this.viewer = new EditionViewerCanvas({
      edition: this.edition,
      fontFamily:  this.options.langDef[this.edition.lang].editionFont,
      scale: 1,
      canvasElement: document.getElementById(`${canvasIdPrefix}${id}`),
      debug: true
    })

    this.zoomController = new ZoomController({
      containerSelector: `${this.containerSelector} div.zoom-controller`,
      onZoom: this.__genOnZoom(),
      debug: true
    })

    this.viewer.render().then( () => {
      console.log(`Edition rendered`)
    })
  }

  __genOnZoom() {
    return  (scale) => {
      return new Promise ( (resolve) => {
        this.viewer.setScale(scale).then( () => {
          this.debug && console.log(`Resolving ${scale}`)
          resolve(scale)
        })
      })
    }

  }

}