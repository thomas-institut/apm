import { ParentContainer } from './ParentContainer.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Container } from './Container.mjs'
import { DIRECTION } from './MultiPanelApp.mjs'
import { DivContainer } from './DivContainer.mjs'
import { NullComponent } from './NullComponent.mjs'
import { SplitGrid } from '../toolbox/SplitGrid.js'


export const FRAME_TYPE = {
  STATIC: 'static',
  DYNAMIC: 'dynamic',
  RESIZABLE: 'resizable',
  DIVIDER: 'divider'
}

const FRAME_CLASS = {
  FRAME: 'mpui-frame',
  DIVIDER: 'mpui-divider'
}

const GRID_CLASS = 'mpui-grid'

const fullScreenStyle = 'position: fixed; top: 0; left:0; right:0; bottom:0;'

export class GridContainer extends ParentContainer {

  /**
   * Options:
   *   childrenDirection: 'vertical' (default) | 'horizontal'
   * @param {{}}options
   */
  constructor (options) {
    super([])

    let validDirections = Object.values(DIRECTION)
    let validFrameTypes = Object.values(FRAME_TYPE)


    let oc = new OptionsChecker({
      context: 'GridContainer',
      optionsDefinition: {
        id: {
          type: 'NonEmptyString',
          default: `${1 + Math.floor(100000*Math.random())}`
        },
        debug: {
          type: 'boolean',
          default: false
        },
        childrenDirection: {
          type: 'string',
          default: 'vertical',
          customCheck: (value) => { return validDirections.indexOf(value) !== -1},
          customCheckDescription: `either 'vertical' or 'horizontal'`
        },
        getParentWindow: {
          type: 'function',
          default: () => { return window }
        },
        fullScreen: {
          type: 'boolean',
          default: false
        },
        extraClasses : {
          type: 'array',
          elementDefinition: { type: 'NonEmptyString'},
          default: []
        },
        dividerWidth: {
          type: 'number',
          default: 3
        },
        frames: {
          type: 'array',
          required: true,
          elementDefinition: {
            type: 'object',
            objectDefinition: {
              type: {
                type: 'string',
                required: true,
                customCheck: (value) => { return validFrameTypes.indexOf(value) !== -1},
                customCheckDescription: `one of [ ${validFrameTypes.join(', ')} ]`
              },
              container: {
                type: 'object',
                objectClass: Container,
                required: true
              }
            }
          }
        }
      }
    })

    let cleanOptions = oc.getCleanOptions(options)
    this.childrenDirection = cleanOptions.childrenDirection
    this.extraClasses = cleanOptions.extraClasses
    this.isFullScreen = cleanOptions.fullScreen
    this.dividerWidth = cleanOptions.dividerWidth
    this.id = cleanOptions.id
    this.debug = cleanOptions.debug
    this.getParentWindow = cleanOptions.getParentWindow
    this.frames = []
    this.setupFrames(cleanOptions.frames)
    this.split = null
    this.splitTracks = this.getSplitTrackInfoFromFrames(this.frames)
  }

  preRender () {
    return new Promise( (resolve) => {
      // destroy current split
      if (this.split !== null) {
        this.split.destroy()
      }
      resolve(true)
    })
  }

  /**
   * Sets up and creates a SplitGrid object for the GridContainer
   * @private
   */
  setupUpSplitGrid() {
    if (this.splitTracks.length === 0) {
      this.split = null
      return
    }
    let splitOptions = {}

    splitOptions.onDragEnd = this.genOnSplitDragEnd()
    splitOptions.window = this.getParentWindow()

    let gutterOptions = this.splitTracks.map( (splitTrackInfo) => {
      return {
        track: splitTrackInfo.track,
        element: this.getParentWindow().document.querySelector(`.${splitTrackInfo.dividerIdClass}`)
      }
    })

    if (this.childrenDirection === DIRECTION.HORIZONTAL) {
      splitOptions.rowGutters  = gutterOptions
    } else {
      splitOptions.columnGutters = gutterOptions
    }

    this.split = new SplitGrid(splitOptions)
  }

  postRender () {
    this.setupUpSplitGrid()
    // if (this.split !== null) {
    //   this.debug && console.log(`Grid ${this.id}: Split set up`)
    //   this.debug && console.log(this.split)
    // }
    return super.postRender()
  }

  /**
   * Sets up the GridContainer with the given frames
   * @param {{}[]}frames
   * @private
   */
  setupFrames(frames) {
    // this.debug && console.log(`Grid ${this.id} : Processing frames. Input frame spec:`)
    // this.debug && console.log(frames)
    this.frames = []
    this.children = []
    let gridTemplateItems = []
    let state = 0
    frames.forEach( (frameSpec) => {
      let container = frameSpec.container
      switch (state) {
        case 0: // waiting for a resizable frame
          switch(frameSpec.type) {
            case FRAME_TYPE.STATIC:
              gridTemplateItems.push('auto')
              this.children.push(container.withExtraClasses([FRAME_CLASS.FRAME, `${FRAME_CLASS.FRAME}-${frameSpec.type}`]))
              this.frames.push(frameSpec)
              break

            case FRAME_TYPE.DYNAMIC:
              gridTemplateItems.push('1fr')
              this.children.push(container.withExtraClasses([FRAME_CLASS.FRAME, `${FRAME_CLASS.FRAME}-${frameSpec.type}`]))
              this.frames.push(frameSpec)
              break

            case FRAME_TYPE.RESIZABLE:
              gridTemplateItems.push('1fr')
              this.children.push(container.withExtraClasses([FRAME_CLASS.FRAME, `${FRAME_CLASS.FRAME}-${frameSpec.type}`]))
              this.frames.push(frameSpec)
              state = 1
          }
          break

        case 1:
          switch(frameSpec.type) {
            case FRAME_TYPE.STATIC:
              gridTemplateItems.push('auto')
              this.children.push(container.withExtraClasses([FRAME_CLASS.FRAME, `${FRAME_CLASS.FRAME}-${frameSpec.type}`]))
              this.frames.push(frameSpec)
              state = 0
              break

            case FRAME_TYPE.DYNAMIC:
              gridTemplateItems.push('1fr')
              this.children.push(container.withExtraClasses([FRAME_CLASS.FRAME, `${FRAME_CLASS.FRAME}-${frameSpec.type}`]))
              this.frames.push(frameSpec)
              state = 0
              break

            case FRAME_TYPE.RESIZABLE: // another resizable, need a divider between the previous and this one
              gridTemplateItems.push(`${this.dividerWidth}px`)
              let dividerId = `${this.id}-${this.children.length}`
              let dividerContainer = new DivContainer(new NullComponent(dividerId))
              dividerContainer.withExtraClasses([ FRAME_CLASS.DIVIDER, `${FRAME_CLASS.DIVIDER}-${this.childrenDirection}`, `${FRAME_CLASS.DIVIDER}-${dividerId}`])
              this.children.push(dividerContainer)
              this.frames.push({
                type: FRAME_TYPE.DIVIDER,
                container: dividerContainer
              })
              gridTemplateItems.push('1fr')
              this.children.push(container.withExtraClasses([FRAME_CLASS.FRAME, `${FRAME_CLASS.FRAME}-${frameSpec.type}`]))
              this.frames.push(frameSpec)
              state = 1
          }
          break
      }
    })
    this.gridTemplate = gridTemplateItems.join(' ')
    // this.debug && console.log(`Grid ${this.id} : Finished processing frames, this.frames: `)
    // this.debug && console.log(this.frames)
  }

  /**
   * Gets all the information needed to set up a SplitGrid object with
   * the given frame information
   * @private
   */
  getSplitTrackInfoFromFrames(frames) {
    let state = 0
    let splitTrackInfo = []
    frames.forEach( (frame, index) => {
      switch(state) {
        case 0: // looking for a resizable frame
          if (frame.type === FRAME_TYPE.RESIZABLE) {
            state = 1
          }
          break

        case 1: // looking for a divider
          if (frame.type === FRAME_TYPE.DIVIDER) {
            state = 2
          } else {
            state = 0
          }
          break

        case 2: // looking for another resizable
          if (frame.type === FRAME_TYPE.RESIZABLE) {
            // two resizable frames with a divider in between, we need to add a split
            let firstResizableIndex = index -2
            let dividerIndex = index -1
            let secondResizableIndex = index
            let dividerContainer = this.frames[dividerIndex].container
            let dividerIdClass = this.getDividerClassIdFromContainer(dividerContainer)
            splitTrackInfo.push ({
              frameIndices: [ firstResizableIndex, secondResizableIndex],
              track: dividerIndex,
              dividerIdClass: dividerIdClass
            })
            state = 1
          }
          // go back to initial state
          state = 0
          break

      }
    })
    return splitTrackInfo
  }

  /**
   * Generates the OnSplitDragEnd handler for a SplitGrid object
   * @return {(function(*, *): void)|*}
   * @private
   */
  genOnSplitDragEnd() {
    return (direction, track) => {
      // this.debug && console.log(`Grid '${this.id}': drag end in track ${track}`)
      let splitTrackInfo = this.getSplitTrackInfoFromTrackNumber(track)
      if (splitTrackInfo === null) {
        console.warn(`Grid '${this.id}': Got drag end event for a non existent track number ${track}`)
        return
      }
      // this.debug && console.log(`Grid '${this.id}': Calling onResize for for frames ${splitTrackInfo.frameIndices.join(' and ')}`)
      splitTrackInfo.frameIndices.forEach( (index) => {
        this.frames[index].container.onResize()
      })
    }
  }

  getSplitTrackInfoFromTrackNumber(track) {
    let index = this.splitTracks.map( sti => sti.track).indexOf(track)
    if (index === -1) {
      return null
    }
    return this.splitTracks[index]
  }

  /**
   *
   * @param {Container}container
   * @return {string}
   * @private
   */
  getDividerClassIdFromContainer(container) {
    return `${FRAME_CLASS.DIVIDER}-${container.getComponents()[0].getId()}`
  }

  getHtml () {
    let templateDirection = this.childrenDirection === DIRECTION.HORIZONTAL ? 'rows' : 'columns'
    let styles = `display: grid; grid-template-${templateDirection}: ${this.gridTemplate};`
    if (this.isFullScreen) {
      styles += ` ${fullScreenStyle}`
    }
    let allClasses = [ GRID_CLASS, `${GRID_CLASS}-${this.id}`, ...this.extraClasses]
    return `<div class="${allClasses.join(' ')}" style="${styles}">${super.getHtml()}</div>`
  }

}