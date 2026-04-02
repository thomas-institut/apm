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


import Split, {SplitOptions} from 'split-grid';
import {createIndexArray, prettyPrintArray} from '@/lib/ToolBox/ArrayUtil';
import {BootstrapTabGenerator} from './BootstrapTabGenerator';
import {UiToolBox} from '@/toolbox/UiToolBox';
import {OptionalPropsRequired} from "@/toolbox/OptionalProps";
import './MultiPanelUI.css';


interface MultiPanelUiOptions {
  logo?: string,
  topBarContent?: () => string;
  topBarRightAreaContent?: () => string;
  icons?: MultiPanelUiIcons,
  panels: [ PanelSpec, PanelSpec],
  panelOrder?: [number, number],
  mode?: MultiPanelUiMode,
  onModeChange?: (mode: MultiPanelUiMode) => void
}

interface PanelSpec {
  id: string;
  type: PanelType;
  tabs: TabSpec[];
  // tab order as a list of indexes to the options.tabs array
  // if an empty array is given, the order will the same as the tabs.array
  tabOrder?: number[],
  // function to call to get the content of a panel of type 'simple
  content?: (panelId: string, mode: MultiPanelUiMode) => string,
  // Function to call after a panel  is rendered
  postRender?: (panelId: string, mode: MultiPanelUiMode) => void;
  // Function to call after a panel is resized
  onResize?: (panelId: string, mode: MultiPanelUiMode) => void;
  activeTabId?: string
}

export interface TabSpec {
  id: string,
  title: string,
  linkTitle?: string,
  content: (tabId: string, mode: string, visible: boolean) => Promise<string>,
  contentClasses?: string[],
  linkClasses?: string[],
  visible?: boolean,
  onResize: (tabId: string, visible: boolean) => void,
  postRender: (tabId: string, currentMode: MultiPanelUiMode, visible: boolean) => void,
  onShown: (tabId: string) => void,
  onHidden: (tabId: string) => void,

}

interface MultiPanelUiIcons {
  closePanel?: string;
  horizontalMode?: string;
  verticalMode?: string;
}
const defaultIcons: MultiPanelUiIcons = {
  closePanel: '&times;',
  horizontalMode: '|',
  verticalMode: '--'
}

// classes
const classes = {
  topBarDiv: 'top-bar',
  topBarToolbar: 'toolbar',
  topBarToolbarGroup: 'toolbar-group',
  topBarIcon: 'top-bar-icon',
  topBarButton: 'top-bar-button',
  modeIcons: 'mode-icons',
  logo: 'logo',
  panel: 'panel',
  dragged: 'dragged',
  draggingInto: 'dragging',
  draggingLast: 'dragging-last'
}

const ids = {
  horizontalModeButton: 'horizontal-mode-btn',
  verticalModeButton: 'vertical-mode-btn',
  panelsDiv: 'panels-div'
}

type MultiPanelUiMode = 'horizontal' | 'vertical'

export const verticalMode = 'vertical';
export const horizontalMode = 'horizontal';

type PanelType = 'simple' | 'tabs';

export const simplePanel = 'simple';
export const tabsPanel = 'tabs';

export class MultiPanelUI {
  private options: Required<MultiPanelUiOptions>;
  private currentMode: MultiPanelUiMode;
  private verticalModeButton!: JQuery<HTMLElement>;
  private horizontalModeButton!: JQuery<HTMLElement>;
  private readonly panels: Required<PanelSpec>[];
  private dragging: boolean = false;
  private dragPanelId!: string;
  private currentTabIds: string[] = [];
  private dragId!: string;
  private dragIndex!: number;

  constructor (options: MultiPanelUiOptions) {

    const defaults: OptionalPropsRequired<MultiPanelUiOptions> = {
      logo: `<span class="${classes.logo}">MPI</span>`,
      panelOrder: [ 0, 1],
      mode: verticalMode,
      topBarContent: () => '',
      topBarRightAreaContent: () => '',
      onModeChange: () => {},
      icons: defaultIcons
    }
    this.options = {...defaults, ...options}
    this.options.icons = {...defaultIcons, ...options.icons}

    this.currentMode = this.options.mode

    // check panels
    let panelArray = this.options.panels
    const PanelSpecDefaults: OptionalPropsRequired<PanelSpec> = {
      tabOrder: [],
      content: () => '',
      postRender: () => {},
      onResize: () => {},
      activeTabId: '',
    }
    const tabSpecDefaults: OptionalPropsRequired<TabSpec> = {
      linkTitle: '',
      contentClasses: [],
      linkClasses: [],
      visible: true
    };

    this.panels = panelArray.map((panelSpec, panelIndex) => {
      const cleanPanelSpec: Required<PanelSpec> = {...PanelSpecDefaults, ...panelSpec};
      if (cleanPanelSpec.type === tabsPanel) {
        if (cleanPanelSpec.tabs.length === 0) {
          throw new Error(`MultiPanelUI: panel ${panelIndex} of type type 'tabs', but no tabs are given`);
        }
        cleanPanelSpec.tabs = cleanPanelSpec.tabs.map((tabSpec) => {
          return {...tabSpecDefaults, ...tabSpec};
        });
        if (cleanPanelSpec.tabOrder.length === 0) {
          cleanPanelSpec.tabOrder = createIndexArray(cleanPanelSpec.tabs.length);
        } else {
          if (cleanPanelSpec.tabOrder.length !== cleanPanelSpec.tabs.length) {
            throw new Error(`Bad tab order array ${prettyPrintArray(cleanPanelSpec.tabOrder)}`);
          }
        }
        if (cleanPanelSpec.activeTabId === '') {
          cleanPanelSpec.activeTabId = cleanPanelSpec.tabs[cleanPanelSpec.tabOrder[0]].id;
        } else {
          if (cleanPanelSpec.tabs.map(tab => tab.id).indexOf(cleanPanelSpec.activeTabId) === -1) {
            throw new Error(`Bad active tab id ${cleanPanelSpec.activeTabId}`);
          }
        }
      }
      return cleanPanelSpec;
    });

    this.panels.forEach((panel, panelIndex) => {
      if (panel.type === tabsPanel) {
        panel.tabs.forEach((tab, tabIndex) => {
          this.panels[panelIndex].tabs[tabIndex].visible = tab.id === panel.activeTabId;
        });
      }
    });
  }

  async start() {
    let body = $('body')
    body.html(`<div class="prerender-msg">Rendering <span class="prerender-spinner"></span></div>`);
    let html = this.genHtmlTopBar()
    html += await this.genHtmlPanels()
    body.html(html)
    this._fitPanelsToScreen()
    this._setupSplit()
    this._setupDraggingEventHandlers()
    this._callPostRenderHandlers()
    this._setupTabEventHandlers()

    this.verticalModeButton = $(`#${ids.verticalModeButton}`)
    this.horizontalModeButton = $(`#${ids.horizontalModeButton}`)

    let thisObject = this

    this.verticalModeButton.on('click', (ev)=> {
      ev.preventDefault()
      if (thisObject.currentMode === verticalMode) {
        return
      }
      //console.log('Switching to vertical mode')
      this.switchMode(verticalMode).then( () => {
        // done
        console.log(`Finished switching to vertical mode`);
      })

    })

    this.horizontalModeButton.on('click', (ev) => {
      ev.preventDefault()
      if (thisObject.currentMode === horizontalMode) {
        return
      }
      //console.log('Switching to horizontal mode')
      this.switchMode(horizontalMode).then( () => {
        // done
        console.log(`Finished switching to horizontal mode`);
      })
    })

    $(window).on('resize',
      () => {
        thisObject._fitPanelsToScreen()
        thisObject._callOnResizeHandlers()
      })

    return true
  }

  _fitPanelsToScreen() {
    // Fit panels and tab content div
    if (this.currentMode === verticalMode) {
      this.panels.forEach( (panel) => {
        maximizeElementHeight($(`#${panel.id}`))
      })
    } else {
      maximizeElementHeight($(`#${ids.panelsDiv}`))
    }
    // Fit tab content
    this.panels.forEach( (panel) => {
      if (panel.type === tabsPanel) {
        let panelDiv = $(`#${panel.id}`)
        let tabsContentsDiv = $(`#${panel.id}-tabs-content`)
        UiToolBox.maximizeElementHeightInParent(tabsContentsDiv, panelDiv, $(`#${panel.id}-tabs`).outerHeight())
        panel.tabs.forEach( (tab) => {
          UiToolBox.maximizeElementHeightInParent($(`#${tab.id}`), tabsContentsDiv,0 )
        })
      }
    })
  }

  _genEventHandlerDragStart(panelId: string, tabs: TabSpec[]) {
    let thisObject = this
    return (ev: any) => {
      let panelIndex = thisObject.panels.map( panel => panel.id).indexOf(panelId)
      let panel = thisObject.panels[panelIndex]
      thisObject.currentTabIds = panel.tabOrder.map( index => tabs[index].id)
      thisObject.dragging = true
      thisObject.dragId = getPanelIdFromTabId(ev.target.id)
      thisObject.dragIndex = thisObject.currentTabIds.indexOf(thisObject.dragId)
      thisObject.dragPanelId = panelId
      console.log(`Drag START: ${thisObject.dragId}, index ${thisObject.dragIndex}, tabs: ${prettyPrintArray(thisObject.currentTabIds)}`)
      $(ev.target).addClass(classes.dragged)
    }
  }
  _genEventHandlerDragEnd() {
    let thisObject = this
    return (ev: any) => {
      thisObject.dragging = false
      // console.log(`...Drag end: ${thisObject.dragId}, index ${thisObject.dragIndex}`)
      $(ev.target).removeClass(classes.dragged)
    }
  }

  _genEventHandlerDragEnter(panelId: string) {
    let thisObject = this
    return (ev: any) => {
        if (!thisObject.dragging) {
          return
        }
        if (panelId !== thisObject.dragPanelId) {
          console.log(`Dragging into a different panel`)
          return
        }
        let element = $(ev.target) as JQuery<HTMLElement>
        if (element.hasClass('nav-link')) {
          let tabId = getPanelIdFromTabId(element.attr('id') ?? '')
          if (tabId === thisObject.dragId) {
            // console.log(`drag enter on same tab`)
            return
          }

          //console.log(`Drag enter on tab ${element.attr('id')}`)
          let index = thisObject.currentTabIds.indexOf(tabId)
          if (index === -1) {
            console.warn(`Hmm, a -1 index found in tabs this should not happen`)
            return
          }
          if (index === thisObject.dragIndex + 1 ) {
            // entering the next tab in the list, nothing to do
            return
          }
          $(ev.target).addClass(classes.draggingInto)
          return
        }
        if (element.hasClass('nav-tabs')) {
          // console.log(`Drag enter on tab div`)
          $(`#${thisObject.currentTabIds[thisObject.currentTabIds.length-1]}-tab`).addClass(classes.draggingLast)
          return
        }
        console.log('Drag enter')
        console.log(ev.target)
    }
  }

  _genEventHandlerDragLeave(panelId: string) {
    let thisObject = this
    return (ev: any) => {
      if (!thisObject.dragging) {
        return
      }
      if (panelId !== thisObject.dragPanelId) {
        console.log(`Dragging from a different panel`)
        return
      }
      let element = $(ev.target) as JQuery<HTMLElement>
      if (element.hasClass('nav-link')) {
        let tabId = getPanelIdFromTabId(element.attr('id') ?? '')
        if (tabId === thisObject.dragId) {
          // console.log(`drag leave on same tab`)
          return
        }

        // console.log(`Drag leave on tab ${element.attr('id')}`)
        let index = thisObject.currentTabIds.indexOf(tabId)
        if (index === -1) {
          console.warn(`Hmm, a -1 index found in tabs this should not happen`)
          return
        }
        if (index === thisObject.dragIndex + 1 ) {
          // entering the next tab in the list, nothing to do
          return
        }
        $(ev.target).removeClass(classes.draggingInto)
        return
      }
      if (element.hasClass('nav-tabs')) {
        // console.log(`Drag leave on tab div`)
        $(`#${thisObject.currentTabIds[thisObject.currentTabIds.length-1]}-tab`).removeClass(classes.draggingLast)
        return
      }
      console.log('Drag leave')
      console.log(ev.target)
    }
  }

  _genEventHandlerDrop(panelId: string) {
    let thisObject = this
    return (ev:any) => {
        if (!thisObject.dragging) {
          return
        }
      if (panelId !== thisObject.dragPanelId) {
        console.log(`Dropping to a different panel... not supported yet`)
        return
      }
      ev.preventDefault()
      let element = $(ev.target) as JQuery<HTMLElement>
      if (element.hasClass('nav-link')) {
        let tabId = getPanelIdFromTabId(element.attr('id') ?? '')
        if (tabId === thisObject.dragId) {
          //console.log(`dropping on the same tab`)
          return
        }

        // console.log(`Drop on tab ${element.attr('id')}`)
        let index = thisObject.currentTabIds.indexOf(tabId)
        if (index === -1) {
          console.warn(`Hmm, a -1 index found in tabs this should not happen`)
          return
        }
        if (index === thisObject.dragIndex + 1 ) {
          // dropping on the next tab in the list, nothing to do
          return
        }
        let panelIndex = thisObject.panels.map( panel => panel.id).indexOf(panelId)
        // console.log(`Moving tab from position ${thisObject.dragIndex} to before tab in position ${index}`)
        // console.log(`Panel index: ${panelIndex}, current order: ${prettyPrintArray(thisObject.panels[panelIndex].tabOrder)}`)
        thisObject.panels[panelIndex].tabOrder = moveTabIndex(thisObject.panels[panelIndex].tabOrder, thisObject.dragIndex, index)
        $(ev.target).removeClass(classes.draggingInto)
        this._updateActiveTabIds()
        thisObject._renderTabList(thisObject.panels[panelIndex])
        return
      }
      if (element.hasClass('nav-tabs')) {
        // console.log(`Drop on tab div`)
        $(`#${thisObject.currentTabIds[thisObject.currentTabIds.length-1]}-tab`).removeClass(classes.draggingLast)
        let index = thisObject.currentTabIds.length
        let panelIndex = thisObject.panels.map( panel => panel.id).indexOf(panelId)
        console.log(`Panel index: ${panelIndex}, current order: ${prettyPrintArray(thisObject.panels[panelIndex].tabOrder)}`)
        console.log(`Moving tab from position ${thisObject.dragIndex} to the end, (index = ${index})`)
        thisObject.panels[panelIndex].tabOrder = moveTabIndex(thisObject.panels[panelIndex].tabOrder, thisObject.dragIndex, index)
        this._updateActiveTabIds()
        this._renderTabList(thisObject.panels[panelIndex])
        return
      }
      console.log(`Drop on other element`)
      console.log(ev)
    }
  }

  _renderTabList(panel: Required<PanelSpec>) {
    let tabGenerator = this._getTabGeneratorForPanel(panel, this.currentMode)
    $(`#${panel.id}-tabs`).replaceWith(tabGenerator.generateTabListHtml())
    this._setupDraggingEventHandlers()
  }

  _setupDraggingEventHandlers() {
    let thisObject = this
    this.panels.forEach( (panel) => {
      if (panel.type !== tabsPanel) {
        return
      }
      $(`#${panel.id}-tabs .nav-link`)
        .on('dragstart', thisObject._genEventHandlerDragStart(panel.id, panel.tabs))
        .on('dragend', thisObject._genEventHandlerDragEnd())

      $(`#${panel.id}-tabs`)
        .on('dragenter', thisObject._genEventHandlerDragEnter(panel.id))
        .on('dragleave', thisObject._genEventHandlerDragLeave(panel.id))
        .on('drop', thisObject._genEventHandlerDrop(panel.id))
        .on('dragover', (ev) => { ev.preventDefault()})
    })
  }

  _callOnResizeHandlers() {
    let currentMode = this.currentMode
    this._updateActiveTabIds()
    this.panels.forEach((panel) => {
      panel.onResize(panel.id, currentMode)
      if (panel.type === 'tabs') {
        //console.log(`Calling on resize handlers for tab panel ${panel.id}, active tab: ${panel.activeTabId}`)
        panel.tabs.forEach((tab) => {
          tab.onResize(tab.id, tab.id === panel.activeTabId)
        })
      }
    })
  }

  async switchMode(newMode: MultiPanelUiMode) {
    this.currentMode = newMode
    this._updateActiveTabIds();
    await this._renderPanels();
    this._setupTabEventHandlers();
    this._fitPanelsToScreen();
    this._setupSplit();
    this._setupDraggingEventHandlers();
    this._callPostRenderHandlers();
    this.options.onModeChange(newMode);
  }

  _updateActiveTabIds() {
    this.panels.forEach( (panel) => {
      if (panel.type === tabsPanel) {
        panel.activeTabId = getActiveTab(panel.tabs.map( tab => tab.id))
      }
    })
  }

  _callPostRenderHandlers() {
    let currentMode = this.currentMode
    this.panels.forEach( (panel) => {
      panel.postRender( panel.id, currentMode)
      if (panel.type === 'tabs') {
        panel.tabs.forEach((tab) => {
          //console.log(`Calling post-render on tab ${tab.id}, visible: ${tab.id === panel.activeTabId}`)
          tab.postRender(tab.id, currentMode, tab.id === panel.activeTabId)
        })
      }
    })
  }


   genHtmlTopBar() {
    return `<div class="${classes.topBarDiv}">
<div class="top-bar-item ${classes.logo}">${this.options.logo}</div>
${this.options.topBarContent()}
<div class="top-bar-item ${classes.topBarToolbar}">
<div class="${classes.topBarToolbarGroup}">
  <button class="${classes.topBarButton}" id="${ids.horizontalModeButton}" role="button" title="Switch to horizontal mode">${this.options.icons.horizontalMode}</a>
  <button class="${classes.topBarButton}" id="${ids.verticalModeButton}" role="button" title="Switch to vertical mode">${this.options.icons.verticalMode}</button>
</div>
${this.options.topBarRightAreaContent()}
</div>
</div>`
  }

  async _renderPanels() {
    let newHtml = await this.genHtmlPanels()
    $(`#${ids.panelsDiv}`).replaceWith(newHtml)
  }


  _setupTabEventHandlers() {
    let thisObject = this
    this.panels.forEach((panel, panelIndex) => {
      if (panel.type === 'tabs') {
        panel.tabs.forEach((tab, tabIndex) => {
          $(`#${tab.id}-tab`)
            .on('shown.bs.tab', () => { thisObject.panels[panelIndex].tabs[tabIndex].visible = true; tab.onShown(tab.id)})
            .on('hidden.bs.tab', () => { thisObject.panels[panelIndex].tabs[tabIndex].visible = false; tab.onHidden(tab.id)})
        })
      }
    })
  }

  /**
   * Generates html for panels
   */
  private async genHtmlPanels() {
    let firstPanel = this.panels[this.options.panelOrder[0]]
    let secondPanel = this.panels[this.options.panelOrder[1]]
    let firstPanelClass = this.currentMode === verticalMode ? 'left-panel' : 'top-panel'
    let secondPanelClass = this.currentMode === verticalMode ? 'right-panel' : 'bottom-panel'
    let panelsDivClass = this.currentMode === verticalMode ? 'vertical-mode' : 'horizontal-mode'
    return `<div class="panels ${panelsDivClass}" id="${ids.panelsDiv}">
<div class="panel ${firstPanelClass}" id="${firstPanel.id}">${await this._getPanelContent(firstPanel)}</div>
<div class="divider"></div>
<div class="panel ${secondPanelClass}" id="${secondPanel.id}">${await this._getPanelContent(secondPanel)}</div>
</div>`
  }

  _getPanelContent(panel: Required<PanelSpec>) {
    switch(panel.type) {
      case simplePanel:
        return panel.content(panel.id, this.currentMode)

      case tabsPanel:
        return this._getTabsHtml(panel, this.currentMode)
    }
  }

  _getTabGeneratorForPanel(panel: Required<PanelSpec>, mode: MultiPanelUiMode) {
    return new BootstrapTabGenerator({
      id: `${panel.id}-tabs`,
      tabs: panel.tabs.map( (tab): TabSpec => {
        return {
          id: tab.id,
          title: tab.title,
          content: tab.content,
          contentClasses: tab.contentClasses,
          linkTitle: tab.linkTitle,
          linkClasses: tab.linkClasses,
          onResize: tab.onResize,
          postRender: tab.postRender,
          onShown: tab.onShown,
          onHidden: tab.onHidden,
        }
      }),
      activeTabId: panel.activeTabId,
      order: panel.tabOrder,
      mode: mode
    })
  }

  _getTabsHtml(panel: Required<PanelSpec>, mode: MultiPanelUiMode) {
    //console.log(`Getting tabs html for panel ${panel.id}, mode ${mode}, activeTabId = ${panel.activeTabId}`)
    let tabGenerator = this._getTabGeneratorForPanel(panel, mode)
    tabGenerator.setActiveTab(panel.activeTabId)
    return tabGenerator.generateHtml()
  }

  _setupSplit() {
    let splitOptions: SplitOptions = {};
    const element = document.querySelector('.divider') as HTMLElement|null;
    if (element === null) return;
    if (this.currentMode === 'vertical') {
      splitOptions.columnGutters = [{
        track: 1,
        element: element,
      }]
    } else {
      splitOptions.rowGutters = [{
        track: 1,
        element: element,
      }]
    }
    let thisObject = this
    splitOptions.onDragStart = () => {
      thisObject.dragging = true
    }
    splitOptions.onDragEnd =  () => {
      thisObject.dragging = false
      thisObject._fitPanelsToScreen()
      thisObject._callOnResizeHandlers()
    }
    Split( splitOptions)
  }
}

/**
 * Maximizes the height of the given element within the browser windows.
 * The max height will be shortened by the given offset.
 *
 * @param element
 * @param offset
 */
function maximizeElementHeight(element: JQuery<HTMLElement>, offset = 0) {
  let elementTop = element.offset()?.top;
  if (elementTop === undefined) return;
  let windowHeight = document.defaultView?.innerHeight;
  if (windowHeight === undefined) return;
  let currentHeight = element.outerHeight();
  let newHeight = windowHeight - elementTop - offset;
  if (newHeight !== currentHeight) {
    element.outerHeight(newHeight);
  }
}



function getPanelIdFromTabId(tabId: string) {
  return tabId.replace(/-tab$/, '')
}



function getActiveTab(tabIdArray: string[]) {
  for (let i=0; i < tabIdArray.length; i++) {
    if ($(`#${tabIdArray[i]}-tab`).hasClass('active')) {
      return tabIdArray[i]
    }
  }
  return ''
}

function moveTabIndex(currentOrder: number[], tabIndexToMove: number, nextTabIndex: number) {
  let newOrder = []
  if (tabIndexToMove === nextTabIndex) {
    return currentOrder
  }
  if (nextTabIndex > tabIndexToMove) {
    for (let i = 0; i < tabIndexToMove; i++) {
      newOrder.push(currentOrder[i])
    }
    for (let i = tabIndexToMove +1; i < nextTabIndex; i++) {
      newOrder.push(currentOrder[i])
    }
    newOrder.push(currentOrder[tabIndexToMove])
    for (let i = nextTabIndex; i < currentOrder.length; i++) {
      newOrder.push(currentOrder[i])
    }
    return newOrder
  }

  for (let i = 0; i < nextTabIndex; i++) {
    newOrder.push(currentOrder[i])
  }
  newOrder.push(currentOrder[tabIndexToMove])
  for (let i = nextTabIndex; i < tabIndexToMove ; i++) {
    newOrder.push(currentOrder[i])
  }
  for (let i = tabIndexToMove+1; i < currentOrder.length; i++) {
    newOrder.push(currentOrder[i])
  }
  return newOrder

}

