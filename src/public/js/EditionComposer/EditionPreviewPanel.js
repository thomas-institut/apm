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
import { PrintedEditionGenerator } from '../PrintedEditionGenerator'
import { EditionViewerSvg } from '../EditionViewerSvg'
import { PanelWithToolbar } from './PanelWithToolbar'
import { Edition } from '../Edition/Edition'
import { EditionViewerSvgNew } from '../Edition/EditionViewerSvgNew'


export class EditionPreviewPanel extends PanelWithToolbar {
  constructor (options = {}) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object', required: true},
      edition: { type: 'object', objectClass: Edition, required: true},
      apparatus: { type: 'object', default: []},
      langDef: { type: 'object', required: true},
      onPdfExport: { type: 'function', default: () => { return Promise.resolve('')}}
    }
    let oc = new OptionsChecker(optionsSpec, 'Edition Preview Panel')
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
                        <a id="export-svg-button" class="tb-button"  download="apm-quick-edition.svg"
                           title="Download SVG"><small>SVG</small> <i class="fas fa-download"></i></a>
                        <a id="export-pdf-button" class="tb-button margin-left-med" href="#" download="apm-quick-edition.pdf"
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
    $('#export-pdf-button').on('click', this._genOnClickExportPdfButton())
  }

  _genOnClickExportPdfButton() {
    let thisObject = this
    return (ev) => {
      ev.preventDefault()
      thisObject.options.onPdfExport($(this.getContentAreaSelector()).html()).then(
        (url) => { console.log(`Got url: '${url}'`)}
      ).catch( () => { console.log('PDF export error')})
    }
  }

  setSvgDownloadFile() {
    let href = 'data:image/svg+xml,' + encodeURIComponent($('#edition-svg-div').html())
    $('#export-svg-button')
      .attr("download", `ApmQuickEdition_${this.ctData['chunkId']}.svg`)
      .attr('href', href)
  }

  _genPreviewHtml() {
    this.verbose && console.log(`Generating preview html`)

    let ev = new EditionViewerSvgNew({
      edition: this.edition,
      fontFamily:  this.options.langDef[this.edition.lang].editionFont
    })
    return ev.getSvg()
  }

}