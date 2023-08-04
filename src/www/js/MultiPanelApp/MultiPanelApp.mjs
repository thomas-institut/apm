import { OptionsChecker } from '@thomas-inst/optionschecker'
// import { PanelController } from './PanelController.mjs'
// import Split from 'split-grid'
// import { makeCopyOfArray } from '../toolbox/ArrayUtil.mjs'
import { WindowContainer } from './WindowContainer.mjs'
import { DivContainer } from './DivContainer.mjs'
import { allTrue } from '../toolbox/ArrayUtil.mjs'
import { GridContainer } from './GridContainer.mjs'
import { TabbedPanelContainer } from './TabbedPanelContainer.mjs'

/**
 * A new version of the multi panel user interface supporting multiple windows.
 *
 * The basic unit for an app is a Component, which is a browser area that displays
 * some sort of content and potentially interacts with other components and
 * with the MultiPanelUI main controller.
 *
 * Visually, the app is composed of a number of windows, each one containing components
 * arranged in fixed or resizable frames or in tabbed panels within one of those frames.
 *
 * Components, therefore, may be displayed inside a frame (fixed or resizable) or as a tab
 * in a tabbed panel. Components in a tabbed panel may be moved within the panel or to
 * any other tabbed panel in the app.
 *
 * MultiPanelUI
 *
 *
 *
 */

export const DIRECTION = {
   HORIZONTAL: 'horizontal',
   VERTICAL: 'vertical'
}

export const CONTAINER_TYPE = {
  DIV: 'div',
  GRID: 'grid',
  TABS: 'tabs'
}

export const MP_APP_CLASS = {
  COMPONENT: 'mpui-component',
  HIDDEN: 'mpui-hidden'
}

const frameClass = 'mpui-frame'

const customStyles = `
  div.${frameClass} {
    width: 100%;
    height: 100%;
    overflow: auto;
  }
  
  div.mpui-divider-vertical {
    cursor: col-resize;
  }
  
  div.mpui-divider-horizontal {
    cursor: row-resize;
  }
 
  div.mpui-content {
    overflow-x: auto;
    overflow-y: auto;
  }
  
  .mpui-hidden {
    display: none;
  }
  
  .mpui-active-tab {
    font-weight: bold;
  }
  
  .mpui-tab {
    margin: 3px;
  }

`

export class MultiPanelApp {

  constructor (options) {
    let optionsSpec = {
      title: { type: 'string'},
      shortTitle : { type: 'string', default: ''},
      windowSpecs: { type: 'array', default: []},
      debug: { type: 'boolean', default: false}
    }
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: "MultiPanelApp"})

    let cleanOptions = oc.getCleanOptions(options)
    this.debug = cleanOptions.debug

    this.debug && console.log(`MultiPanelApp Clean Options`)
    this.debug && console.log(cleanOptions)

    this.title = cleanOptions.title
    this.shortTitle = cleanOptions.shortTitle === '' ? this.title : cleanOptions.shortTitle

    /**
     *
     * @type {WindowContainer[]}
     */
    this.windows = []
    cleanOptions.windowSpecs.forEach(( windowSpec) =>{
      this.addWindow(windowSpec)
    })

    this.debug && console.log(`Rendering ${this.windows.length} window(s)`)
    this.render().then( (r) => {
      if (!r){
        console.error(`Error rendering MultiPanelApp`)
      } else {

        this.debug && console.log(`MultiPanel App initialized`)
      }
    })
  }

  /**
   * Adds a new window.
   * Returns the index to new window
   * @param windowSpec
   * @return{number}
   */
  addWindow(windowSpec) {
    let index = this.windows.length
    let windowContainer
    if (index === 0) {
      windowContainer = new WindowContainer(null)
    } else {
      let target = windowSpec === undefined ? '' :  windowSpec.target
      let features = windowSpec.features === undefined ? '' : windowSpec.features
      let windowProxy = window.open("", target, features)
      windowContainer = new WindowContainer(windowProxy, [])
    }
    windowContainer.addStyles(customStyles)
    if (windowSpec.style !== undefined) {
      windowContainer.addStyles(windowSpec.style)
    }
    let title = this.title
    if (index !== 0) {
      title += `: ${index+1}`
    }
    windowContainer.setTitle(title)
    let debug
    windowSpec.containers.forEach( (containerSpec) => {
      switch(containerSpec.type) {
        case CONTAINER_TYPE.DIV:
          windowContainer.addChildContainer( new DivContainer(containerSpec.component))
          break

        case CONTAINER_TYPE.GRID:
          debug = true
          let gridContainer = new GridContainer({
            debug: debug,
            id: containerSpec.id,
            childrenDirection: containerSpec.childrenDirection,
            fullScreen: containerSpec.fullScreen,
            getParentWindow: () => { return windowContainer.getDomWindow()},
            frames: containerSpec.frames.map( ( frameSpec) => {
              return {
                type: frameSpec.type,
                container:  this.getContainerForGridFromFrameSpec(frameSpec, windowContainer, debug)
              }
            })
          })
          windowContainer.addChildContainer(gridContainer)
          break

        case CONTAINER_TYPE.TABS:
          debug= true
          let tabsContainer = new TabbedPanelContainer({
            debug: debug,
            id: containerSpec.id,
            tabs: containerSpec.tabs
          })
          windowContainer.addChildContainer(tabsContainer)
      }
    })
    this.windows.push(windowContainer)
    return index
  }


  /**
   *
   * @param {{}}frameSpec
   * @param {WindowContainer}windowContainer
   * @param {boolean}debug
   * @return {GridContainer|DivContainer|TabbedPanelContainer}
   * @private
   */
  getContainerForGridFromFrameSpec(frameSpec, windowContainer, debug) {
    if (frameSpec.component !== undefined) {
      return new DivContainer(frameSpec.component)
    }
    if (frameSpec.frames !== undefined) {
      // another grid!
      return new GridContainer({
        debug: debug,
        id: frameSpec.id,
        getParentWindow: () => { return windowContainer.getDomWindow()},
        childrenDirection: frameSpec.childrenDirection === undefined ? DIRECTION.VERTICAL : frameSpec.childrenDirection,
        frames: frameSpec.frames.map((subFrameSpec) => {
          return {
            type: subFrameSpec.type,
            container: this.getContainerForGridFromFrameSpec(subFrameSpec, windowContainer, debug)
          }
        })
      })
    }
    if (frameSpec.tabs !== undefined) {
      // a tabbed panel
      return new TabbedPanelContainer({
        id: frameSpec.id,
        debug: debug,
        tabs: frameSpec.tabs
      })
    }
  }

  renderWindow(index) {
    return this.windows[index].render()
  }

  async render() {
    let promises = this.windows.map( (window) => {
      return window.render()
    })
    return (allTrue(await Promise.all(promises)))
  }


}