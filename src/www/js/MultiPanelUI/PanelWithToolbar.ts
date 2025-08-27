import { Panel } from './Panel'
import {OptionsChecker} from '@thomas-inst/optionschecker'
import { UiToolBox } from '@/toolbox/UiToolBox'

const toolbarClass: string = 'panel-toolbar'
const contentAreaClass  = 'panel-content'
const contentClass = 'panel-with-toolbar'

export class PanelWithToolbar extends Panel {
  private readonly maximizeContentArea: boolean
  protected readonly contentAreaId: string;

  constructor (options: any) {
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

  onResize (visible: boolean) {
    super.onResize(visible)
    if (this.maximizeContentArea) {
      //console.log(`Resizing content area for '${this.containerSelector}'`)
      UiToolBox.maximizeElementHeightInParent($(this.getContentAreaSelector()), $(this.containerSelector), $(this.getToolbarSelector()).outerHeight())
    }
  }

  async generateHtml (tabId: string , mode: string , visible: boolean ) {
    let toolbarClassString = this.getToolbarClasses().concat( [ toolbarClass]).join(' ')
    let toolbarHtml = this.generateToolbarHtml(tabId, mode, visible)
    let contentAreaClassString = this.getContentAreaClasses().concat( [ contentAreaClass]).join(' ')
    let contentHtml = await this.generateContentHtml(tabId, mode, visible)
    let contentAreaIdString = this.contentAreaId !== '' ?  `id="${this.contentAreaId}"` : ''
    return `<div class="${toolbarClassString}">${toolbarHtml}</div><div class="${contentAreaClassString}" ${contentAreaIdString}>${contentHtml}</div>`
  }

  getContentClasses(): string[] {
    return super.getContentClasses().concat([contentClass])
  }

  getContentAreaSelector() {
    return `${this.containerSelector} .${contentAreaClass}`
  }

  getToolbarSelector() {
    return `${this.containerSelector} .${toolbarClass}`
  }

  getToolbarClasses() : string[]{
    return []
  }

  generateToolbarHtml(_tabId: string, _mode: string, _visible: boolean): string {
    return ''
  }

  async generateContentHtml(_tabId: string, _mode: string, _visible: boolean ): Promise<string> {
    return ''
  }

  getContentAreaClasses(): string[] {
    return []
  }

  onShown () {
    super.onShown()
  }

  onHidden () {
    super.onHidden()
  }

  postRender (id: string, mode: string, visible: boolean) {
    super.postRender(id, mode, visible)
    if (this.maximizeContentArea) {
      //console.log(`Resizing content area for '${this.containerSelector}'`)
      UiToolBox.maximizeElementHeightInParent($(this.getContentAreaSelector()), $(this.containerSelector), $(this.getToolbarSelector()).outerHeight())
    }
  }

  replaceContent(newHtml: string) {
    $(this.getContentAreaSelector()).html(newHtml)
  }

}