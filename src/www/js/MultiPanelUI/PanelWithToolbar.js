import { Panel } from './Panel'
import { maximizeElementHeightInParent } from '../toolbox/UserInterfaceUtil'
import {OptionsChecker} from '@thomas-inst/optionschecker'

const toolbarClass = 'panel-toolbar'
const contentAreaClass  = 'panel-content'
const contentClass = 'panel-with-toolbar'

export class PanelWithToolbar extends Panel {

  constructor (options) {
    super(options)
    let optionsSpec = {
      maximizeContentArea: { type: 'boolean', default: true},
      contentAreaId: { type: 'string', default: ''}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:  'PanelWithToolbar'})
    let cleanOptions = oc.getCleanOptions(options)
    this.maximizeContentArea = cleanOptions.maximizeContentArea
    this.contentAreaId = cleanOptions.contentAreaId
  }

  onResize (visible) {
    super.onResize(visible)
    if (this.maximizeContentArea) {
      //console.log(`Resizing content area for '${this.containerSelector}'`)
      maximizeElementHeightInParent($(this.getContentAreaSelector()), $(this.containerSelector), $(this.getToolbarSelector()).outerHeight())
    }
  }

  generateHtml (tabId, mode, visible) {
    let toolbarClassString = this.getToolbarClasses().concat( [ toolbarClass]).join(' ')
    let toolbarHtml = this.generateToolbarHtml(tabId, mode, visible)
    let contentAreaClassString = this.getContentAreaClasses().concat( [ contentAreaClass]).join(' ')
    let contentHtml = this.generateContentHtml(tabId, mode, visible)
    let contentAreaIdString = this.contentAreaId !== '' ?  `id="${this.contentAreaId}"` : ''
    return `<div class="${toolbarClassString}">${toolbarHtml}</div><div class="${contentAreaClassString}" ${contentAreaIdString}>${contentHtml}</div>`
  }

  getContentClasses () {
    return super.getContentClasses().concat([contentClass])
  }

  getContentAreaSelector() {
    return `${this.containerSelector} .${contentAreaClass}`
  }

  getToolbarSelector() {
    return `${this.containerSelector} .${toolbarClass}`
  }

  getToolbarClasses() {
    return []
  }

  generateToolbarHtml(tabId, mode, visible) {
    return ''
  }

  generateContentHtml(tabId, mode, visible) {
    return ''
  }

  getContentAreaClasses() {
    return []
  }

  onShown () {
    super.onShown()
  }

  onHidden () {
    super.onHidden()
  }

  postRender (id, mode, visible) {
    super.postRender(id, mode, visible)
  }

  replaceContent(newHtml) {
    $(this.getContentAreaSelector()).html(newHtml)
  }

}