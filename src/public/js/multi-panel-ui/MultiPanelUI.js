import { OptionsChecker } from '@thomas-inst/optionschecker'
import Split from 'split-grid'
import { prettyPrintArray } from '../toolbox/ArrayUtil'
import { BootstrapTabGenerator } from './BootstrapTabGenerator'

const defaultIcons = {
  closePanel: '&times;',
  horizontalMode: '<img src="/images/horizontal-mode.svg" height="20"/>',
  verticalMode: '<img src="/images/vertical-mode.svg" height="20"/>'
}

// classes
const classes = {
  topBarDiv: 'top-bar',
  topBarIcon: 'top-bar-icon',
  modeIcons: 'mode-icons',
  logo: 'logo',
  panel: 'panel'
}

const ids = {
  horizontalModeButton: 'horizontal-mode-btn',
  verticalModeButton: 'vertical-mode-btn',
  panelsDiv: 'panels-div'
}


export class MultiPanelUI {

  constructor (options) {
    let optionsSpec = {
      logo: {
        type: 'string',
        default: '<span class="logo">MPI</span>'
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
        default: 'vertical'
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
      if (cleanPanelOptions.type === 'tabs') {
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
      }
      goodPanelOptionsArray.push(cleanPanelOptions)
    })
    this.options.panels = goodPanelOptionsArray

    // console.log(`MultiPanelUI options`)
    // console.log(this.options)
  }

  start() {
    let thisObject = this
    return new Promise( () => { thisObject._doStart() })
  }

  _doStart() {
    let body = $('body')
    body.html(`Rendering....`)
    let html = this._genHtmlTopBar()
    html += this._genHtmlPanels()
    body.html(html)
    this.fitPanelsToScreen()
    this._setupSplit()
    this.callPostRenderHandlers()

    this.verticalModeButton = $(`#${ids.verticalModeButton}`)
    this.horizontalModeButton = $(`#${ids.horizontalModeButton}`)

    let thisObject = this

    this.verticalModeButton.on('click', (ev)=> {
      ev.preventDefault()
      if (thisObject.currentMode === 'vertical') {
        return
      }
      //console.log('Switching to vertical mode')
      this.switchMode('vertical')

    })

    this.horizontalModeButton.on('click', (ev) => {
      ev.preventDefault()
      if (thisObject.currentMode === 'horizontal') {
        return
      }
      //console.log('Switching to horizontal mode')
      this.switchMode('horizontal')
    })

    $(window).on('resize',
      () => {
        thisObject.fitPanelsToScreen()
        thisObject.callOnResizeHandlers()
      })

    return true
  }

  fitPanelsToScreen() {
    let thisObject = this
    // Fit panels and tab content div
    if (this.currentMode === 'vertical') {
      this.options.panels.forEach( (panel) => {
        let panelDiv = $(`#${panel.id}`)
        thisObject._maximizeElementHeight(panelDiv)
      })
    } else {
      thisObject._maximizeElementHeight($('#panels-div'))
    }
    // Fit tab content
    this.options.panels.forEach( (panel) => {
      if (panel.type === 'tabs') {
        let panelDiv = $(`#${panel.id}`)
        let tabsContentsDiv = $(`#${panel.id}-tabs-content`)
        maximizeElementHeightInParent(tabsContentsDiv, panelDiv, $(`#${panel.id}-tabs`).outerHeight())
        panel.tabs.forEach( (tab) => {
          maximizeElementHeightInParent($(`#${tab.id}`), tabsContentsDiv,0 )
        })
      }
    })

  }

  _maximizeElementHeight(element) {
    let elementTop = element.offset().top
    let windowHeight = document.defaultView.innerHeight
    let currentHeight = element.outerHeight()
    let newHeight = windowHeight - elementTop
    if (newHeight !== currentHeight) {
      element.outerHeight(newHeight)
    }
  }

  callOnResizeHandlers() {
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
    this._renderPanels()
    this.fitPanelsToScreen()
    this._setupSplit()
    this.callPostRenderHandlers()
  }

  callPostRenderHandlers() {
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
<div class="top-bar-item ${classes.modeIcons}">
  <a class="${classes.topBarIcon}" id="${ids.horizontalModeButton}" role="button" href="#" title="Switch to horizontal mode">${this.options.icons.horizontalMode}</a>
  <a class="${classes.topBarIcon}" id="${ids.verticalModeButton}" role="button" href="#" title="Swith to vertical mode">${this.options.icons.verticalMode}</a>
</div>
<div class="top-bar-item top-bar-right-area-content">
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
    let firstPanelClass = this.currentMode === 'vertical' ? 'left-panel' : 'top-panel'
    let secondPanelClass = this.currentMode === 'vertical' ? 'right-panel' : 'bottom-panel'
    let panelsDivClass = this.currentMode === 'vertical' ? 'vertical-mode' : 'horizontal-mode'
    return `<div class="panels ${panelsDivClass}" id="${ids.panelsDiv}">
<div class="panel ${firstPanelClass}" id="${firstPanel.id}">${this._getPanelContent(firstPanel)}</div>
<div class="divider"></div>
<div class="panel ${secondPanelClass}" id="${secondPanel.id}">${this._getPanelContent(secondPanel)}</div>
</div>`
  }

  _getPanelContent(panel) {
    switch(panel.type) {
      case 'simple':
        return panel.content(panel.id, this.currentMode)

      case 'tabs':
        return this._getTabsHtml(panel)
    }
  }

  _getTabsHtml(panel) {
    let tabGenerator = new BootstrapTabGenerator({
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
      })
    })
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
    splitOptions.onDragStart = (direction, track) => {
      thisObject.dragging = true
    }
    splitOptions.onDragEnd =  (direction, track) => {
      thisObject.dragging = false
      thisObject.fitPanelsToScreen()
      thisObject.callOnResizeHandlers()
    }
    this.split = Split( splitOptions)
  }

}


function maximizeElementHeightInParent(element, parent, offset) {
  let currentHeight = element.outerHeight()
  let parentHeight = parent.height()
  //console.log(`Maximizing height: current ${currentHeight}, parent ${parentHeight}, offset ${offset}`)
  let newHeight = parentHeight - offset
  if (newHeight !== currentHeight) {
    element.outerHeight(newHeight)
  }
}


function doNothing() {}
function returnEmptyString() { return ''}