import { TypesetterToken2 } from './TypesetterToken2'

export class Box extends TypesetterToken2 {

  constructor () {
    super()
    this.width = 0
    this.height = 0
  }

  getWidth() {
    return this.width
  }

  setWidth(width) {
    this.width = width
    return this
  }

  getHeight() {
    return this.height
  }

  setHeight(height) {
    this.height = height
    return this
  }

}