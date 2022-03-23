import { TypesetterToken2 } from './TypesetterToken2'

export class Glue extends TypesetterToken2 {

  constructor () {
    super()
    this.stretch = 0
    this.shrink = 0
    this.width = 0
  }

  getWidth() {
    return this.width
  }

  setWidth(width) {
    this.width = width
    return this
  }

  getStretch() {
    return this.stretch
  }

  setStretch(stretch) {
    this.stretch = stretch
    return this
  }

  getShrink() {
    return this.shrink
  }

  setShrink(shrink) {
    this.shrink = shrink
    return this
  }


}