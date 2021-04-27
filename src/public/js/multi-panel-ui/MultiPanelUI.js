import { OptionsChecker } from '@thomas-inst/optionschecker'
import Split from 'split-grid'

const defaultIcons = {
  closePanel: '&times;',
  horizontalMode: 'H',
  verticalMode: 'V'
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
      content: {
        type: 'function',
        default: (mode) => { return 'Empty Panel'}
      },
      postRender: {
        type: 'function',
        default: (id, mode) => { }
      },
      onResize: {
        type: 'function',
        default: (id, mode) => { }
      }
    }
    let goodPanelOptionsArray = []
    panelArray.forEach( (panelOption, index) => {
      let checker = new OptionsChecker(panelOptionsSpec, `MultiPanelUI: options for panel ${index}`)
      goodPanelOptionsArray.push(checker.getCleanOptions(panelOption))
    })
    this.options.panels = goodPanelOptionsArray

  }

  start() {
    let body = $('body')
    body.html(`Rendering....`)
    let html = this._genHtmlTopBar()
    html += this._genHtmlPanels()
    body.html(html)
    this.fitPanelsToScreen()
    this._setupSplit()
    this.postRenderPanels()

    this.verticalModeButton = $(`#${ids.verticalModeButton}`)
    this.horizontalModeButton = $(`#${ids.horizontalModeButton}`)

    let thisObject = this

    this.verticalModeButton.on('click', (ev)=> {
      ev.preventDefault()
      if (thisObject.currentMode === 'vertical') {
        return
      }
      console.log('Switching to vertical mode')
      this.switchMode('vertical')

    })

    this.horizontalModeButton.on('click', (ev) => {
      ev.preventDefault()
      if (thisObject.currentMode === 'horizontal') {
        return
      }
      console.log('Switching to horizontal mode')
      this.switchMode('horizontal')
    })

    $(window).on('resize',
      () => {
        thisObject.fitPanelsToScreen()
        thisObject.callPanelResizeHandlers()
      })
  }

  fitPanelsToScreen() {
    let thisObject = this
    const offset = 10
    if (this.currentMode === 'vertical') {
      this.options.panels.forEach( (panel) => {
        thisObject._maximizeElementHeight($(`#${panel.id}`), offset)
      })
    } else {
      thisObject._maximizeElementHeight($('#panels-div'), offset)
    }
  }

  _maximizeElementHeight(element, offset) {
    let elementTop = element.offset().top
    let windowHeight = document.defaultView.innerHeight
    let currentHeight = element.height()
    let newHeight = windowHeight - elementTop - offset
    if (newHeight !== currentHeight) {
      element.height(newHeight)
    }
  }

  callPanelResizeHandlers() {
    let currentMode = this.currentMode
    this.options.panels.forEach((panel) => {
      panel.onResize(panel.id, currentMode)
    })
  }

  switchMode(newMode) {
    this.currentMode = newMode
    this._renderPanels()
    this.fitPanelsToScreen()
    this._setupSplit()
    this.postRenderPanels()
  }

  postRenderPanels() {
    let currentMode = this.currentMode
    this.options.panels.forEach( (panel) => {
      panel.postRender( panel.id, currentMode)
    })
  }

  _genHtmlTopBar() {
    return `<div class="${classes.topBarDiv}">
<div class="${classes.logo}">${this.options.logo}</div>
<div class="${classes.modeIcons}">
  <a class="${classes.topBarIcon}" id="${ids.horizontalModeButton}" role="button" href="#" title="Switch to horizontal mode">${this.options.icons.horizontalMode}</a>
  <a class="${classes.topBarIcon}" id="${ids.verticalModeButton}" role="button" href="#" title="Swith to vertical mode">${this.options.icons.verticalMode}</a>
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
<div class="panel ${firstPanelClass}" id="${firstPanel.id}">${firstPanel.content(this.currentMode)}</div>
<div class="divider"></div>
<div class="panel ${secondPanelClass}" id="${secondPanel.id}">${secondPanel.content(this.currentMode)}</div>
</div>`
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
      thisObject.callPanelResizeHandlers()
    }
    this.split = Split( splitOptions)
  }

}