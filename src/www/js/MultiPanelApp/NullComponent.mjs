import { Component } from './Component.mjs'

export class NullComponent extends Component {

  constructor (id) {
    super(id)
    this.title = `Null ${id}`
  }
  getHtml () {
    return ''
  }
}