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
      maximizeContentArea: { type: 'boolean', default: true}
    }

    let oc = new OptionsChecker(optionsSpec, 'PanelWithToolbar')
    let cleanOptions = oc.getCleanOptions(options)
    this.maximizeContentArea = cleanOptions.maximizeContentArea
  }

  onResize (visible) {
    super.onResize(visible)
    if (this.maximizeContentArea) {
      //this.verbose && console.log(`Resizing content area for '${this.containerSelector}'`)
      maximizeElementHeightInParent($(this.getContentAreaSelector()), $(this.containerSelector), $(this.getToolbarSelector()).outerHeight())
    }
  }

  generateHtml (tabId, mode, visible) {
    let toolbarClassString = this.getToolbarClasses().concat( [ toolbarClass]).join(' ')
    let toolbarHtml = this.generateToolbarHtml(tabId, mode, visible)
    let contentAreaClassString = this.getContentAreaClasses().concat( [ contentAreaClass]).join(' ')
    let contentHtml = this.generateContentHtml(tabId, mode, visible)
    return `<div class="${toolbarClassString}">${toolbarHtml}</div><div class="${contentAreaClassString}">${contentHtml}</div>`
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


}