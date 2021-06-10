/**
 * Edition Preview Panel.
 *
 *  - SVG representation of the edition
 *  - SVG and PDF export button
 */
import {OptionsChecker} from '@thomas-inst/optionschecker'
import { PrintedEditionGenerator } from '../PrintedEditionGenerator'
import { EditionViewerSvg } from '../EditionViewerSvg'
import { maximizeElementHeightInParent} from '../toolbox/UserInterfaceUtil'
import { Panel } from './Panel'


export class EditionPreviewPanel extends Panel {
  constructor (options = {}) {
    super(options)
    let optionsSpec = {
      containerSelector: { type: 'string', required: true},
      ctData: { type: 'object', default: []},
      apparatus: { type: 'object', default: []},
      langDef: { type: 'object', required: true},
      onPdfExport: { type: 'function', default: () => { return Promise.resolve('')}}
    }
    let oc = new OptionsChecker(optionsSpec, 'Edition Preview Panel')
    this.options = oc.getCleanOptions(options)
    this.ctData = this.options.ctData
    this.previewHtml = ''
  }

  getContentClasses() {
    return [ 'panel-with-toolbar']
  }

  updatePreview() {
    this.previewHtml = this._genPreviewHtml()
    $('#edition-svg-div').html(this.previewHtml)
    this.setSvgDownloadFile()
  }

  generateHtml() {
    this.verbose && console.log(`Rendering preview`)
    if (this.previewHtml === '') {
      this.previewHtml = this._genPreviewHtml()
    }

    return `<div class="panel-toolbar">
                    <div>
                    </div>
                    <div>
                        <a id="export-svg-button" class="tb-button"  download="apm-quick-edition.svg"
                           title="Download SVG"><small>SVG</small> <i class="fas fa-download"></i></a>
                        <a id="export-pdf-button" class="tb-button margin-left-med" href="#" download="apm-quick-edition.pdf"
                           title="Download PDF"><small>PDF</small> <i class="fas fa-download"></i></a>
                    </div>
                </div>
                <div id="edition-svg-div" class="panel-content-area">${this.previewHtml}</div>`
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
      thisObject.options.onPdfExport($('#edition-svg-div').html()).then(
        (url) => { console.log(`Got url: '${url}'`)}
      ).catch( () => { console.log('PDF export error')})
    }
  }

  onResize() {
    this.verbose && console.log(`Resize edition preview pane`)
    let previewDiv = $(`${this.options.containerSelector} .panel-content-area`)
    let toolbarDiv = $(`${this.options.containerSelector} .panel-toolbar`)
    maximizeElementHeightInParent(previewDiv, $(this.options.containerSelector), toolbarDiv.outerHeight())
  }

  setSvgDownloadFile() {
    let href = 'data:image/svg+xml,' + encodeURIComponent($('#edition-svg-div').html())
    $('#export-svg-button')
      .attr("download", `ApmQuickEdition_${this.ctData['chunkId']}.svg`)
      .attr('href', href)
  }

  _genPreviewHtml() {
    this.verbose && console.log(`Generating preview html`)
    if (this.ctData === []) {
      return `Waiting for ctData`
    }
    let peg = new PrintedEditionGenerator()
    let edition = peg.generateEdition(this.ctData, this.ctData['witnessOrder'][0])
    let ev = new EditionViewerSvg( {
      lang: edition.lang,
      collationTokens: edition.mainTextTokens,
      apparatusArray: edition.apparatusArray,
      isRightToLeft: (edition.textDirection === 'rtl'),
      fontFamily: this.options.langDef[this.ctData['lang']].editionFont,
      addGlue: false
    })
    return ev.getSvg()
  }

}