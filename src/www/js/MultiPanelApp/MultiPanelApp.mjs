import { OptionsChecker } from '@thomas-inst/optionschecker'
// import { PanelController } from './PanelController.mjs'
// import Split from 'split-grid'
// import { makeCopyOfArray } from '../toolbox/ArrayUtil.mjs'
import { WindowContainer } from './WindowContainer.mjs'
import { DivContainer } from './DivContainer.js'
import { allTrue } from '../toolbox/ArrayUtil.mjs'

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

// export const HORIZONTAL_DIRECTION = 'horizontal'
export const VERTICAL_DIRECTION = 'vertical'

// export const PANEL_STYLE_FIXED = 'fixed'
// export const PANEL_STYLE_CONTENT = 'content'
// export const PANEL_STYLE_MULTI = 'multi'

export const MpAppClasses = {
  component: 'mpui-component'

}

const frameClass = 'mpui-frame'
// const dividerWidth = '3px'
//
// const FRAME_TYPE_DIVIDER = 'divider'
// const FRAME_TYPE_CONTENT = 'content'
// const FRAME_TYPE_MULTI = 'multi'
// const FRAME_TYPE_FIXED = 'fixed'
const customStyles = `
  div.${frameClass} {
    width: 100%;
    height: 100%
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
    windowSpec.containers.forEach( (containerSpec) => {
      switch(containerSpec.type) {
        case 'div':
          windowContainer.addChildContainer( new DivContainer(containerSpec.component))
          break
      }
    })
    this.windows.push(windowContainer)
    return index
  }

  renderWindow(index) {
    return this.windows[index].render()
  }

  //
  // getSplits(resizableFrameIndices, dividerFrames, direction, ascendants) {
  //   // Split-grid has peculiar settings for tracks, we have to do this case by case
  //   let gutters
  //   let splitOptions
  //   let splits = []
  //   switch(resizableFrameIndices.length) {
  //     case 2:
  //       gutters = [ {
  //         track: resizableFrameIndices[0]+1,
  //         element: document.querySelector(`div.${dividerFrames[0].classId}`)
  //       }]
  //       if (direction === 'horizontal') {
  //         splitOptions = { rowGutters: gutters}
  //       } else {
  //         splitOptions = { columnGutters: gutters}
  //       }
  //       splitOptions.onDragEnd = this.genOnSplitDragEnd(ascendants)
  //       this.debug && console.log(`Adding split with options`)
  //       this.debug && console.log(splitOptions)
  //       splits.push({
  //         ascendants: ascendants,
  //         splitObject: Split(splitOptions)
  //       })
  //       break
  //
  //     case 3:
  //       gutters = [
  //         {
  //           track: resizableFrameIndices[0]+1,
  //           element: document.querySelector(`.${dividerFrames[0].classId}`)
  //         },
  //         {
  //           track: resizableFrameIndices[2]+1,
  //           element: document.querySelector(`.${dividerFrames[1].classId}`)
  //         },
  //       ]
  //       if (direction === 'horizontal') {
  //         splitOptions = { rowGutters: gutters}
  //       } else {
  //         splitOptions = { column: gutters}
  //       }
  //       splitOptions.onDragEnd = this.genOnSplitDragEnd(ascendants)
  //       splits.push({
  //         ascendants: ascendants,
  //         splitObject: Split(splitOptions)
  //       })
  //       break
  //   }
  //   return splits
  // }

  // /**
  //  * Generates the handler for the DragEnd event on a Split
  //  * @param ascendants
  //  * @return {(function(*, *): void)|*}
  //  */
  // genOnSplitDragEnd(ascendants) {
  //   return (direction, track) => {
  //     this.debug && console.log(`Drag end: ${ascendants.join('-')}, ${parent}, track ${track}`)
  //
  //     // get parent
  //     let parent = this.frameInfoTree
  //     ascendants.forEach( (ascendantIndex) => {
  //       if (Array.isArray(parent)) {
  //         parent = parent[ascendantIndex]
  //       } else {
  //         parent = parent.frames[ascendantIndex]
  //       }
  //     })
  //
  //     let promises = this.emitOnResizeForFrameInfo(parent.frames)
  //     Promise.all(promises).then( () => {
  //       this.debug && console.log(`All panels resized`)
  //     })
  //   }
  // }
  //
  // emitOnResizeForFrameInfo(frameInfoArray) {
  //   let promises = []
  //   frameInfoArray.forEach( (frameInfo) => {
  //     switch (frameInfo.type) {
  //       case FRAME_TYPE_CONTENT:
  //         promises.push(frameInfo.controller.resize())
  //         break
  //
  //       case FRAME_TYPE_MULTI:
  //         promises.push(...this.emitOnResizeForFrameInfo(frameInfo.frames))
  //         break
  //     }
  //   })
  //   return promises
  // }


  // /**
  //  * Initializes split objects for the given frame into tree
  //  * @param frameInfoTree
  //  * @param {number[]}ascendants
  //  * @return {*[]}
  //  * @private
  //  */
  // initializeSplits(frameInfoTree, ascendants) {
  //   let splits = []
  //
  //   // first, initialize this level splits
  //   let direction = ''
  //   let state = 0
  //   let resizableFrameIndices = []
  //   let dividerFrames = []
  //   let gutters
  //   let splitOptions
  //   for(let index = 0; index < frameInfoTree.length; index++) {
  //     let frame = frameInfoTree[index]
  //     switch(state) {
  //       case 0:  // waiting for a resizable frame
  //         if (frame.type === FRAME_TYPE_MULTI || frame.type === FRAME_TYPE_CONTENT) {
  //           resizableFrameIndices.push(index)
  //           direction = frame.direction
  //           state = 1
  //         }
  //         break
  //
  //       case 1: // just got a resizable frame, looking for a divider
  //         if (frame.type === FRAME_TYPE_DIVIDER) {
  //           dividerFrames.push(frame)
  //           state = 2
  //         } else {
  //           // if we have collected 2 or more resizable frames, we need a split
  //           // the details are handled by the getSplits method
  //
  //           splits.push(...this.getSplits(resizableFrameIndices, dividerFrames, direction, ascendants))
  //           resizableFrameIndices = []
  //           dividerFrames = []
  //           state = 0
  //         }
  //         break
  //
  //
  //       case 2: //just got a divider, looking for a resizable frame
  //         if (frame.type === FRAME_TYPE_MULTI || frame.type === FRAME_TYPE_CONTENT) {
  //           resizableFrameIndices.push(index)
  //           state = 1
  //         } else {
  //           // got something else, go back to initial state
  //           resizableFrameIndices = []
  //           dividerFrames = []
  //           state = 0
  //         }
  //     }
  //   }
  //   // got to the end, add left-over splits
  //   if (state !== 0) {
  //     splits.push(...this.getSplits(resizableFrameIndices, dividerFrames, direction, ascendants))
  //   }
  //   // then, add splits from descendants
  //   frameInfoTree.forEach((frame, index) => {
  //     if (frame.type === FRAME_TYPE_MULTI) {
  //       let trunk = makeCopyOfArray(ascendants)
  //       trunk.push(index)
  //       splits.push(...this.initializeSplits(frame.frames, trunk))
  //     }
  //   })
  //   return splits
  // }

  // /**
  //  * Builds a tree of panel controller from the given spec array
  //  * The elements of the resulting array are either PanelController objects
  //  * or arrays for sub-branches.
  //  * @param {*[]}panelSpecArray
  //  * @return {[]}
  //  * @private
  //  */
  // buildPanelControllerTree(panelSpecArray) {
  //   let branch = []
  //   panelSpecArray.forEach( (panelSpec) => {
  //     switch(panelSpec.style) {
  //       case PANEL_STYLE_FIXED:
  //       case PANEL_STYLE_CONTENT:
  //         branch.push(new PanelController(panelSpec.style, panelSpec.panel, panelSpec.direction))
  //         break
  //
  //       case PANEL_STYLE_MULTI:
  //         branch.push([...this.buildPanelControllerTree(panelSpec.panels)])
  //         break
  //     }
  //   })
  //   return branch
  // }

  // maximizeContainerHeight () {
  //   let windowHeight = document.defaultView.innerHeight
  //   $(`div.left-panel`).outerHeight(windowHeight)
  // }

  // setupTestSplit() {
  //   let splitOptions = {}
  //   splitOptions.columnGutters = [
  //   //   {
  //   //     track: 1,
  //   //     element: document.querySelector('.divider-1'),
  //   // },
  //     {
  //       track: 3,
  //       element: document.querySelector('.divider-4'),
  //     }
  //   ]
  //
  //   splitOptions.rowGutters = [{
  //     track: 1,
  //     element: document.querySelector('.divider-2'),
  //   },
  //     {
  //       track: 3,
  //       element: document.querySelector('.divider-3'),
  //     },
  //     {
  //       track: 1,
  //       element: document.querySelector('.divider-5'),
  //     },
  //     {
  //       track: 3,
  //       element: document.querySelector('.divider-6'),
  //     }
  //   ]
  //
  //   splitOptions.onDragEnd =  (direction, track) => {
  //     console.log(`Drag end ${direction}:${track}`)
  //   }
  //   this.split = Split(splitOptions)
  // }
  //
  // /**
  //  * Assi
  //  * @param {*[]}frames
  //  * @param {number[]}ascendantIndexes
  //  * @return {*}
  //  */
  // assignIdsToFrames(frames, ascendantIndexes ) {
  //   return frames.map( (frame, index) => {
  //     let ascendants = makeCopyOfArray(ascendantIndexes)
  //     ascendants.push(index)
  //     frame.classId = `mpui-${frame.type}-${ascendants.join('-')}`
  //     if (frame.type === FRAME_TYPE_MULTI) {
  //       frame.frames = this.assignIdsToFrames(frame.frames, ascendants)
  //     }
  //     return frame
  //   })
  // }

  // /**
  //  * Return a data structure containing all the required frames
  //  * for the given controller tree branch.
  //  * @param {*[]}panelControllerTree
  //  * @param {number}level
  //  * @return {*[]}
  //  * @private
  //  */
  // buildFrameInfoTree(panelControllerTree, level) {
  //   let frames = []
  //   let state = 0
  //   let currentDirection = ''
  //
  //   panelControllerTree.forEach( (panelControllerBranch, index) => {
  //     if (Array.isArray(panelControllerBranch)) {
  //       if (state === 1) {
  //         frames.push({ type: FRAME_TYPE_DIVIDER, direction: currentDirection, frameSpec: dividerWidth, level: level, controller: null})
  //       }
  //       // a multi-frame branch
  //       frames.push({ type:FRAME_TYPE_MULTI, direction: currentDirection, frameSpec: '1fr', level: level, frames: this.buildFrameInfoTree(panelControllerBranch, level+1) })
  //       state = 1
  //       return
  //     }
  //     // single controller branch
  //     let pc = panelControllerBranch
  //     let panelStyle = pc.getStyle()
  //     currentDirection = pc.getDirection()
  //     switch(state) {
  //       case 0:
  //
  //         switch(panelStyle) {
  //           case PANEL_STYLE_FIXED:
  //             frames.push ( { type: FRAME_TYPE_FIXED, direction:currentDirection, frameSpec: 'auto', level: level, controller: pc})
  //             break
  //
  //           case PANEL_STYLE_CONTENT:
  //             frames.push ( { type: FRAME_TYPE_CONTENT, direction:currentDirection, frameSpec: '1fr', level: level, controller: pc})
  //             state = 1
  //             break
  //
  //           default:
  //             console.warn(`Unknown panel style '${panelStyle}' at index ${index}`)
  //         }
  //         break
  //
  //       case 1:
  //         switch(panelStyle) {
  //           case PANEL_STYLE_FIXED:
  //             frames.push ( {  type: FRAME_TYPE_FIXED, direction:currentDirection, frameSpec: 'auto', level: level,controller: pc})
  //             state = 0
  //             break
  //
  //           case PANEL_STYLE_CONTENT:
  //             frames.push({ type: FRAME_TYPE_DIVIDER, direction:currentDirection, frameSpec: dividerWidth, level: level, controller: null})
  //             frames.push ( {type: FRAME_TYPE_CONTENT,  direction:currentDirection, frameSpec: '1fr', level: level, controller: pc})
  //             break
  //
  //           default:
  //             console.warn(`Unknown panel style '${panelStyle}' at index ${index}`)
  //         }
  //     }
  //   })
  //
  //   return this.assignIdsToFrames(frames, [])
  // }

  // /**
  //  *
  //  * @param {*[]}frameInfoTree
  //  * @param {string}direction
  //  * @param {number}level
  //  * @return {string}
  //  * @private
  //  */
  // getGridHtmlForFrameInfoTree(frameInfoTree, direction, level = 1) {
  //   let gridSetup = frameInfoTree.map( (frameInfo) => {
  //     return frameInfo.frameSpec
  //   }).join(' ')
  //   let topStyle = direction === 'horizontal' ?
  //     `display: grid; grid-template-rows: ${gridSetup}` :
  //     `display: grid; grid-template-columns: ${gridSetup}`
  //
  //   return [
  //     `<div class="${frameClass} mpui-${direction} mpui-frame-level-${level}" style="${topStyle}">`,
  //       ...frameInfoTree.map( (frameInfo, index) => {
  //         if (frameInfo.type === 'multi') {
  //           let childFrameDirection = direction === 'horizontal' ? 'vertical' : 'horizontal'
  //           return this.getGridHtmlForFrameInfoTree(frameInfo.frames, childFrameDirection, level+1)
  //         }
  //         if (frameInfo.controller === undefined) {
  //           console.warn(`Undefined controller`)
  //           console.log(frameInfo)
  //         }
  //         let pc = frameInfo.controller
  //         if (pc === null) {
  //           return `<div class="mpui-divider mpui-divider-${direction} ${frameInfo.classId}"></div>`
  //         } else {
  //           // TODO: fix this, should not set it here
  //           pc.setContainerSelector(`div.${frameInfo.classId}`)
  //           return `<div class="${frameClass} mpui-${frameInfo.type} mpui-${frameInfo.type}-${direction} ${frameInfo.classId} ${pc.getContainerClasses().join(' ')} "></div>`
  //         }
  //       }),
  //     `</div>`
  //   ].join('')
  // }

  // async renderBranch(branch) {
  //   if (Array.isArray(branch)) {
  //     for (let i = 0; i < branch.length; i++) {
  //       let child = branch[i]
  //       let result = await this.renderBranch(child)
  //       if (!result) {
  //         return false
  //       }
  //     }
  //     return true
  //   } else {
  //     return await branch.renderPanel()
  //   }
  // }

  // destroyCurrentSplits() {
  //   this.splits.forEach( (splitInfo) => {
  //     splitInfo.splitObject.destroy()
  //   })
  // }

  async render() {
    let promises = this.windows.map( (window) => {
      return window.render()
    })
    return (allTrue(await Promise.all(promises)))
  }

  // setDirection(direction) {
  //   this.direction = direction
  // }

  /**
   *
   * @param style
   * @param {Component}panel
   */
  // async addPanel(style, panel) {
  //   let pc = new PanelController(style, panel)
  //   await pc.setDirection(this.direction === HORIZONTAL_DIRECTION ? VERTICAL_DIRECTION : HORIZONTAL_DIRECTION, true)
  //
  // }

}