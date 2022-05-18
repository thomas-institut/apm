/*
 *  Copyright (C) 2021 Universität zu Köln
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


/**
 * Edition Preview Panel.
 *
 *  - SVG representation of the edition
 *  - SVG and PDF export button
 */
import {OptionsChecker} from '@thomas-inst/optionschecker'
import { PanelWithToolbar } from './PanelWithToolbar'
import { Edition } from '../Edition/Edition'
import { EditionViewerSvg } from '../Edition/EditionViewerSvg'


const defaultIcons = {
  busy: '<i class="fas fa-circle-notch fa-spin"></i>'
}

const exportPdfButtonId = 'export-pdf-btn'
const exportSvgButtonId = 'export-svg-btn'

export class EditionPreviewPanel extends PanelWithToolbar {
  constructor (options = {}) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object', required: true},
      edition: { type: 'object', objectClass: Edition, required: true},
      apparatus: { type: 'object', default: []},
      langDef: { type: 'object', required: true},
      onPdfExport: { type: 'function', default: () => { return Promise.resolve('')}},
      icons: { type: 'object', default: defaultIcons}
    }
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:  'Edition Preview Panel'})
    this.options = oc.getCleanOptions(options)
    this.ctData = this.options.ctData
    this.edition = this.options.edition
    this.previewHtml = ''
  }

  updateData(ctData, edition) {
    this.verbose && console.log(`Updating data`)
    this.ctData = ctData
    this.edition = edition
    this.updatePreview()
  }

  updatePreview() {
    this.previewHtml = this._genPreviewHtml()
    $(this.getContentAreaSelector()).html(this.previewHtml)
    this.setSvgDownloadFile()
  }

  generateToolbarHtml (tabId, mode, visible) {
    return ` <div>
                    </div>
                    <div>
                        <a id="${exportSvgButtonId}" class="tb-button"  download="apm-edition-preview.svg"
                           title="Download SVG"><small>SVG</small> <i class="fas fa-download"></i></a>
                        <a id="${exportPdfButtonId}" class="tb-button margin-left-med" href="#" download="apm-edition-preview.pdf"
                           title="Download PDF"><small>PDF</small> <i class="fas fa-download"></i></a>
                    </div>`
  }

  generateContentHtml (tabId, mode, visible) {
    this.verbose && console.log(`Rendering preview`)
    if (this.previewHtml === '') {
      this.previewHtml = this._genPreviewHtml()
    }
    return this.previewHtml
  }

  postRender() {
    this.verbose && console.log(`Post render edition preview pane`)
    this.onResize()
    this.setSvgDownloadFile()
    $(`#${exportPdfButtonId}`).on('click', this._genOnClickExportPdfButton())
  }

  _genOnClickExportPdfButton() {
    return (ev) => {
      ev.preventDefault()
      let exportPdfButton = $(`#${exportPdfButtonId}`)
      let currentButtonHtml = exportPdfButton.html()
      let svg = $(this.getContentAreaSelector()).html()
      if (svg === '') {
        return false
      }
      exportPdfButton.html(`Generating PDF... ${this.options.icons.busy}`)
      this.options.onPdfExport(svg).then( (url) => {
          exportPdfButton.html(currentButtonHtml)
          window.open(url)
        }
      ).catch( () => {
          console.log('PDF export error')
        })
      return true
    }
  }

  setSvgDownloadFile() {
    let href = 'data:image/svg+xml,' + encodeURIComponent($(this.getContentAreaSelector()).html())
    $($(`#${exportSvgButtonId}`))
      .attr("download", `ApmQuickEdition_${this.ctData['chunkId']}.svg`)
      .attr('href', href)
  }

  _genPreviewHtml() {
    this.verbose && console.log(`Generating preview html`)

    let ev = new EditionViewerSvg({
      edition: this.edition,
      fontFamily:  this.options.langDef[this.edition.lang].editionFont
    })
    return ev.getSvg()
  }

}