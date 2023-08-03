/**
 * Multi Panel UI version 2 visual test
 */

import { MultiPanelApp } from '../../../js/MultiPanelApp/MultiPanelApp.mjs'
import { StaticContentComponent } from '../../../js/MultiPanelApp/StaticContentComponent'
import { Component } from '../../../js/MultiPanelApp/Component.mjs'

let extraStyles = `
    html {
      font-family: "Segoe UI", Arial, sans-serif;
    }
    body {
      padding: 0;
      margin: 0;
    }
    .header {
      font-size: 1.5em;
      border-bottom: 1px solid silver;
      margin-bottom: 5px;
    }
`

let app

$( () => {
  app = new MultiPanelApp({
    title: 'My App',
    windowSpecs : [
      { // Main window
        style: extraStyles,
        containers: [
        {
          type: 'div',
          component: new StaticContentComponent('header', 'My App', ['header'])
        },
        {
          type: 'div',
          component: new WindowAdder('main')
        },
      ]
      }
    ],
    debug: true
  })


})


class WindowAdder extends Component {

  constructor (id) {
    super(id)
    this.newWindows = 0
  }

  getHtml () {
      return `<p>This is the app's content</p><p><button id="new-window">New Window</button></p>`
  }

  postRender () {
    return new Promise( (resolve) => {
      $('#new-window').on('click', async () => {
        this.newWindows++
        let target =''
        let features = ''
        let newWindowSpec = { // Second window
          target: target,
          features: features,
          style: extraStyles,
          containers: [ {
            type: 'div',
            component: new StaticContentComponent('extra', `This is window number ${this.newWindows + 1}`, ['content'])
          }]
        }
        let index = app.addWindow(newWindowSpec)
        await app.renderWindow(index)
      })
    })
  }
}



