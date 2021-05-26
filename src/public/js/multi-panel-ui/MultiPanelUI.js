import { OptionsChecker } from '@thomas-inst/optionschecker'
import Split from 'split-grid'
import { createIndexArray, prettyPrintArray } from '../toolbox/ArrayUtil'
import { BootstrapTabGenerator } from './BootstrapTabGenerator'
import { maximizeElementHeightInParent} from '../toolbox/UserInterfaceUtil'

const defaultIcons = {
  closePanel: '&times;',
  horizontalMode: '<img src="/images/horizontal-mode.svg" alt="Horizontal Mode"/>',
  verticalMode: '<img src="/images/vertical-mode.svg" alt="Vertical Mode"/>'
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

export const verticalMode = 'vertical'
export const horizontalMode = 'horizontal'

export const simplePanel = 'simple'
export const tabsPanel = 'tabs'

export class MultiPanelUI {
  constructor (options) {
    let optionsSpec = {
      logo: {
        type: 'string',
        default: `<span class="${classes.logo}">MPI</span>`
      },
      topBarContent: {
        type: 'function',
        default: returnEmptyString
      },
      topBarRightAreaContent: {
        type: 'function',
        default: returnEmptyString
      },
      icons: {
        type: 'object',
        default: defaultIcons
      },
      panels: {
        type: 'Array',
        required: true
      },
      panelOrder: {
        type: 'Array',
        default: [0, 1]
      },
      mode: {
        type: 'string',  // 'vertical' | 'horizontal'
        default: verticalMode
      }
    }

    let oc = new OptionsChecker(optionsSpec, 'MultiPanelUI')
    this.options = oc.getCleanOptions(options)
    this.currentMode = this.options.mode

    // check panels
    let panelArray = this.options.panels
    if (panelArray.length !== 2) {
      console.error(`MultiPanelUI: require exactly two items in options.panels, ${panelArray.length} given`)
      return
    }
    let panelOptionsSpec = {
      id: {
        type: 'string',
        required: true
      },
      type: {
        //  'simple' | 'tabs'
        type: 'string',
        required: true
      },
      tabs: {
        // tab specification for a panel of type 'tabs'
        type: 'array',
        default: []
      },
      tabOrder: {
        // tab order as a list of indexes to the options.tabs array
        // if an empty array is given, the order will the same as the tabs.array
        type: 'array',
        default: []
      },
      content: {
        // function to call to get the content of a panel of type 'simple
        // (panelId, mode) =>  string
        type: 'function',
        default: returnEmptyString
      },
      postRender: {
        // Function to call after a panel  is rendered
        //  (panelId, mode) =>  void
        type: 'function',
        default: doNothing
      },
      onResize: {
        // Function to call after a panel is resized
        //  (panelId, mode) =>  void
        type: 'function',
        default: doNothing
      },
      activeTabId: {
        // id of the initially active tab
        // if not given or empty, the first tab will be the active one
        type: 'string',
        default: ''
      }
    }
    let tabOptionsSpec = {
      id: {
        type: 'NonEmptyString',
        required: true
      },
      title: {
        type: 'NonEmptyString',
        required: true
      },
      linkTitle: {
        type: 'string',
        default: ''
      },
      content: {
        // function to call to generate the html inside the tab's content div
        //  (tabId, mode) =>  string
        type: 'function',
        required: true
      },
      tabClasses: {
        // array of additional classes to apply to the tab's link
        type: 'array',
        default: []
      },
      contentClasses: {
        // array of additional classes to apply to the tab's content div
        type: 'array',
        default: []
      },
      postRender: {
        // Function to call after the tab's content is rendered
        //  (tabId) => void
        type: 'function',
        default: doNothing
      },
      onResize: {
        // Function to call after a tab is resized
        // (tabId) => void
        type: 'function',
        default: doNothing
      },
    }
    let goodPanelOptionsArray = []
    panelArray.forEach( (panelOption, panelIndex) => {
      let panelOptionsChecker = new OptionsChecker(panelOptionsSpec, `MultiPanelUI: options for panel ${panelIndex}`)
      let cleanPanelOptions = panelOptionsChecker.getCleanOptions(panelOption)
      if (cleanPanelOptions.type === tabsPanel) {
        if (cleanPanelOptions.tabs.length === 0) {
          console.error(`MultiPanelUI: panel ${panelIndex} of type type 'tabs', but no tabs are given`)
        }
        let goodTabOptionsArray = []
        cleanPanelOptions.tabs.forEach( (tabOption, tabIndex) => {
          let tabOptionsChecker = new OptionsChecker(tabOptionsSpec, `MultiPanelUI: options for tab ${tabIndex} in panel ${panelIndex}`)
          let cleanTabOptions = tabOptionsChecker.getCleanOptions(tabOption)
          // do more checks
          goodTabOptionsArray.push(cleanTabOptions)
        })
        cleanPanelOptions.tabs = goodTabOptionsArray
        if (cleanPanelOptions.tabOrder.length === 0) {
          cleanPanelOptions.tabOrder = createIndexArray(cleanPanelOptions.tabs.length)
        } else {
          if (cleanPanelOptions.tabOrder.length !== cleanPanelOptions.tabs.length) {
            console.warn(`Bad tab order array ${prettyPrintArray(cleanPanelOptions.tabOrder)}, using default order`)
            cleanPanelOptions.tabOrder = createIndexArray(cleanPanelOptions.tabs.length)
          }
        }
        if (cleanPanelOptions.activeTabId === '') {
          cleanPanelOptions.activeTabId = cleanPanelOptions.tabs[cleanPanelOptions.tabOrder[0]].id
        } else {
          if ( cleanPanelOptions.tabs.map( tab => tab.id).indexOf(cleanPanelOptions.activeTabId) === -1) {
            console.warn(`Bad active tab id ${cleanPanelOptions.activeTabId}, using default`)
            cleanPanelOptions.activeTabId = cleanPanelOptions.tabs[cleanPanelOptions.tabOrder[0]].id
          }
        }
      }
      goodPanelOptionsArray.push(cleanPanelOptions)
    })
    this.options.panels = goodPanelOptionsArray

  }

  start() {
    let thisObject = this
    return new Promise( (resolve) => {
      thisObject._doStart()
      resolve()
    })
  }

  _doStart() {
    let body = $('body')
    body.html(`Rendering....`)
    let html = this._genHtmlTopBar()
    html += this._genHtmlPanels()
    body.html(html)
    this._fitPanelsToScreen()
    this._setupSplit()
    this._setupDraggingEventHandlers()
    this._callPostRenderHandlers()

    this.verticalModeButton = $(`#${ids.verticalModeButton}`)
    this.horizontalModeButton = $(`#${ids.horizontalModeButton}`)

    let thisObject = this

    this.verticalModeButton.on('click', (ev)=> {
      ev.preventDefault()
      if (thisObject.currentMode === verticalMode) {
        return
      }
      //console.log('Switching to vertical mode')
      this.switchMode(verticalMode)

    })

    this.horizontalModeButton.on('click', (ev) => {
      ev.preventDefault()
      if (thisObject.currentMode === horizontalMode) {
        return
      }
      //console.log('Switching to horizontal mode')
      this.switchMode(horizontalMode)
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
      this.options.panels.forEach( (panel) => {
        let panelDiv = $(`#${panel.id}`)
        maximizeElementHeight(panelDiv)
      })
    } else {
      maximizeElementHeight($(`#${ids.panelsDiv}`))
    }
    // Fit tab content
    this.options.panels.forEach( (panel) => {
      if (panel.type === tabsPanel) {
        let panelDiv = $(`#${panel.id}`)
        let tabsContentsDiv = $(`#${panel.id}-tabs-content`)
        maximizeElementHeightInParent(tabsContentsDiv, panelDiv, $(`#${panel.id}-tabs`).outerHeight())
        panel.tabs.forEach( (tab) => {
          maximizeElementHeightInParent($(`#${tab.id}`), tabsContentsDiv,0 )
        })
      }
    })
  }

  _genEventHandlerDragStart(panelId, tabs) {
    let thisObject = this
    return (ev) => {
      let panelIndex = thisObject.options.panels.map( panel => panel.id).indexOf(panelId)
      let panel = thisObject.options.panels[panelIndex]
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
    return (ev) => {
      thisObject.dragging = false
      // console.log(`...Drag end: ${thisObject.dragId}, index ${thisObject.dragIndex}`)
      $(ev.target).removeClass(classes.dragged)
    }
  }

  _genEventHandlerDragEnter(panelId) {
    let thisObject = this
    return (ev) => {
        if (!thisObject.dragging) {
          return
        }
        if (panelId !== thisObject.dragPanelId) {
          console.log(`Dragging into a different panel`)
          return
        }
        let element = $(ev.target)
        if (element.hasClass('nav-link')) {
          let tabId = getPanelIdFromTabId(element.attr('id'))
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

  _genEventHandlerDragLeave(panelId) {
    let thisObject = this
    return (ev) => {
      if (!thisObject.dragging) {
        return
      }
      if (panelId !== thisObject.dragPanelId) {
        console.log(`Dragging from a different panel`)
        return
      }
      let element = $(ev.target)
      if (element.hasClass('nav-link')) {
        let tabId = getPanelIdFromTabId(element.attr('id'))
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

  _genEventHandlerDrop(panelId) {
    let thisObject = this
    return (ev) => {
        if (!thisObject.dragging) {
          return
        }
      if (panelId !== thisObject.dragPanelId) {
        console.log(`Dropping to a different panel... not supported yet`)
        return
      }
      ev.preventDefault()
      let element = $(ev.target)
      if (element.hasClass('nav-link')) {
        let tabId = getPanelIdFromTabId(element.attr('id'))
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
        let panelIndex = thisObject.options.panels.map( panel => panel.id).indexOf(panelId)
        // console.log(`Moving tab from position ${thisObject.dragIndex} to before tab in position ${index}`)
        // console.log(`Panel index: ${panelIndex}, current order: ${prettyPrintArray(thisObject.options.panels[panelIndex].tabOrder)}`)
        thisObject.options.panels[panelIndex].tabOrder = moveTabIndex(thisObject.options.panels[panelIndex].tabOrder, thisObject.dragIndex, index)
        $(ev.target).removeClass(classes.draggingInto)
        this._updateActiveTabIds()
        thisObject._renderTabList(thisObject.options.panels[panelIndex])
        return
      }
      if (element.hasClass('nav-tabs')) {
        // console.log(`Drop on tab div`)
        $(`#${thisObject.currentTabIds[thisObject.currentTabIds.length-1]}-tab`).removeClass(classes.draggingLast)
        let index = thisObject.currentTabIds.length
        let panelIndex = thisObject.options.panels.map( panel => panel.id).indexOf(panelId)
        console.log(`Panel index: ${panelIndex}, current order: ${prettyPrintArray(thisObject.options.panels[panelIndex].tabOrder)}`)
        console.log(`Moving tab from position ${thisObject.dragIndex} to the end, (index = ${index})`)
        thisObject.options.panels[panelIndex].tabOrder = moveTabIndex(thisObject.options.panels[panelIndex].tabOrder, thisObject.dragIndex, index)
        this._updateActiveTabIds()
        this._renderTabList(thisObject.options.panels[panelIndex])
        return
      }
      console.log(`Drop on other element`)
      console.log(ev)
    }
  }

  _renderTabList(panel) {
    let tabGenerator = this._getTabGeneratorForPanel(panel)
    $(`#${panel.id}-tabs`).replaceWith(tabGenerator.generateTabListHtml())
    this._setupDraggingEventHandlers()
  }

  _setupDraggingEventHandlers() {
    let thisObject = this
    this.options.panels.forEach( (panel) => {
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
    this.options.panels.forEach((panel) => {
      panel.onResize(panel.id, currentMode)
      if (panel.type === 'tabs') {
        panel.tabs.forEach((tab) => {
          tab.onResize(tab.id)
        })
      }
    })
  }

  switchMode(newMode) {
    this.currentMode = newMode
    this._updateActiveTabIds()
    this._renderPanels()
    this._fitPanelsToScreen()
    this._setupSplit()
    this._setupDraggingEventHandlers()
    this._callPostRenderHandlers()
  }

  _updateActiveTabIds() {
    this.options.panels.forEach( (panel) => {
      if (panel.type === tabsPanel) {
        panel.activeTabId = getActiveTab(panel.tabs.map( tab => tab.id))
      }
    })
  }

  _callPostRenderHandlers() {
    let currentMode = this.currentMode
    this.options.panels.forEach( (panel) => {
      panel.postRender( panel.id, currentMode)
      if (panel.type === 'tabs') {
        panel.tabs.forEach((tab) => {
          tab.postRender(tab.id)
        })
      }
    })
  }

  _genHtmlTopBar() {
    return `<div class="${classes.topBarDiv}">
<div class="top-bar-item ${classes.logo}">${this.options.logo}</div>
${this.options.topBarContent()}
<div class="top-bar-item ${classes.topBarToolbar}">
<div class="${classes.topBarToolbarGroup}">
  <button class="${classes.topBarButton}" id="${ids.horizontalModeButton}" role="button" title="Switch to horizontal mode">${this.options.icons.horizontalMode}</a>
  <button class="${classes.topBarButton}" id="${ids.verticalModeButton}" role="button" title="Swith to vertical mode">${this.options.icons.verticalMode}</button>
</div>
${this.options.topBarRightAreaContent()}
</div>
</div>`
  }

  _renderPanels() {
    let newHtml = this._genHtmlPanels()
    $(`#${ids.panelsDiv}`).replaceWith(newHtml)
  }

  _genHtmlPanels() {
    let firstPanel = this.options.panels[this.options.panelOrder[0]]
    let secondPanel = this.options.panels[this.options.panelOrder[1]]
    let firstPanelClass = this.currentMode === verticalMode ? 'left-panel' : 'top-panel'
    let secondPanelClass = this.currentMode === verticalMode ? 'right-panel' : 'bottom-panel'
    let panelsDivClass = this.currentMode === verticalMode ? 'vertical-mode' : 'horizontal-mode'
    return `<div class="panels ${panelsDivClass}" id="${ids.panelsDiv}">
<div class="panel ${firstPanelClass}" id="${firstPanel.id}">${this._getPanelContent(firstPanel)}</div>
<div class="divider"></div>
<div class="panel ${secondPanelClass}" id="${secondPanel.id}">${this._getPanelContent(secondPanel)}</div>
</div>`
  }

  _getPanelContent(panel) {
    switch(panel.type) {
      case simplePanel:
        return panel.content(panel.id, this.currentMode)

      case tabsPanel:
        return this._getTabsHtml(panel)
    }
  }

  _getTabGeneratorForPanel(panel) {
    return new BootstrapTabGenerator({
      id: `${panel.id}-tabs`,
      tabs: panel.tabs.map( (tab) => {
        return {
          id: tab.id,
          title: tab.title,
          content: tab.content,
          contentClasses: tab.contentClasses,
          linkTitle: tab.linkTitle,
          linkClasses: tab.tabClasses
        }
      }),
      activeTabId: panel.activeTabId,
      order: panel.tabOrder
    })
  }

  _getTabsHtml(panel) {
    let tabGenerator = this._getTabGeneratorForPanel(panel)
    //tabGenerator.setActiveTab(panel.activeTabId)
    return tabGenerator.generateHtml()
  }

  _setupSplit() {
    let splitOptions = {}
    if (this.currentMode === 'vertical') {
      splitOptions.columnGutters = [{
        track: 1,
        element: document.querySelector('.divider'),
      }]
    } else {
      splitOptions.rowGutters = [{
        track: 1,
        element: document.querySelector('.divider'),
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
    this.split = Split( splitOptions)
  }
}

// function maximizeElementHeightInParent(element, parent, offset = 0) {
//   let currentHeight = element.outerHeight()
//   let parentHeight = parent.height()
//   //console.log(`Maximizing height: current ${currentHeight}, parent ${parentHeight}, offset ${offset}`)
//   let newHeight = parentHeight - offset
//   if (newHeight !== currentHeight) {
//     element.outerHeight(newHeight)
//   }
// }


function maximizeElementHeight(element, offset = 0) {
  let elementTop = element.offset().top
  let windowHeight = document.defaultView.innerHeight
  let currentHeight = element.outerHeight()
  let newHeight = windowHeight - elementTop - offset
  if (newHeight !== currentHeight) {
    element.outerHeight(newHeight)
  }
}



function getPanelIdFromTabId(tabId) {
  return tabId.replace(/-tab$/, '')
}



function getActiveTab(tabIdArray) {
  for (let i=0; i < tabIdArray.length; i++) {
    if ($(`#${tabIdArray[i]}-tab`).hasClass('active')) {
      return tabIdArray[i]
    }
  }
  return ''
}

function moveTabIndex(currentOrder, tabIndexToMove, nextTabIndex) {
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

function doNothing() {}
function returnEmptyString() { return ''}