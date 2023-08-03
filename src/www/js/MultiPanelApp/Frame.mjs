

export const FRAME_TYPE_DIVIDER = 'divider'
export const FRAME_TYPE_CONTENT = 'content'
export const FRAME_TYPE_MULTI = 'multi'
export const FRAME_TYPE_FIXED = 'fixed'

export class Frame  {

  constructor (defaultDividerSpec = '3px') {
    this.type = FRAME_TYPE_CONTENT
    this.controller = null
    this.frames = []
    this.defaultDividerSpec = defaultDividerSpec
  }

  /**
   *
   * @param {string}type
   * @param {PanelController|null}controller
   * @return {Frame}
   */
  withType(type, controller) {
    this.type = type
    if (type === FRAME_TYPE_DIVIDER) {
      this.controller = null
    } else {
      this.controller = controller
    }
    return this
  }

  /**
   *
   * @param {Frame[]}frames
   * @return {Frame}
   */
  withSubFrames(frames) {
    this.type = FRAME_TYPE_MULTI
    this.controller = null
    this.frames = frames
    return this
  }

  getFrameSpec() {
    switch (this.type) {
      case FRAME_TYPE_FIXED:
        return 'auto'

      case FRAME_TYPE_DIVIDER:
        return this.defaultDividerSpec

      default:
        return '1fr'
    }
  }

}