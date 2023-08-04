/**
 * Multi Panel UI version 2 visual test
 */

import { CONTAINER_TYPE, DIRECTION, MultiPanelApp } from '../../../js/MultiPanelApp/MultiPanelApp.mjs'
import { StaticContentComponent } from '../../../js/MultiPanelApp/StaticContentComponent.mjs'
import { Component } from '../../../js/MultiPanelApp/Component.mjs'
import { FRAME_TYPE } from '../../../js/MultiPanelApp/GridContainer.mjs'
import { resolvedPromise } from '../../../js/toolbox/FunctionUtil.mjs'
import { LoremIpsum } from 'lorem-ipsum'
import { createIndexArray } from '../../../js/toolbox/ArrayUtil.mjs'

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
    .footer {
      font-style: 'italic';
      font-size: 0.8em;
      border-top: 1px solid silver;
    }
     .mpui-divider {
            background: silver;
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
            type: CONTAINER_TYPE.GRID,
            id: 'app',
            childrenDirection: DIRECTION.HORIZONTAL,
            fullScreen: true,
            frames: [
              {
                type: FRAME_TYPE.STATIC,
                component: new StaticContentComponent('header', 'My App', ['header'])
              },
              {
                type: FRAME_TYPE.DYNAMIC,
                childrenDirection: DIRECTION.VERTICAL,
                id: 'content',
                frames: [
                  {
                    type: FRAME_TYPE.RESIZABLE,
                    component: new WindowAdder('left')
                  },
                  {
                    type: FRAME_TYPE.RESIZABLE,
                    id: 'rightTabs',
                    tabs: [
                      new StaticContentComponent('pears', generateSomeText()).withTitle('Pears'),
                      new StaticContentComponent('oranges', generateSomeText()).withTitle('Oranges'),
                      new StaticContentComponent('bananas', generateSomeText()).withTitle('Bananas')
                    ]

                  },
                ]
              },

              {
                type: FRAME_TYPE.STATIC,
                component: new StaticContentComponent('footer', 'Footer, (C) 2023', ['footer'])
              },
            ]
          }
      ]
      }
    ],
    debug: true
  })


})


class WindowAdder extends Component {

  constructor (id) {
    super(id)
    this.title= `Window Adder ${id}`
    this.newWindows = 0
  }

  getHtml () {
      return `<p>This is the app's content</p><p><button id="new-window">New Window</button></p>`
  }

  /**
   *
   * @return {Promise<boolean>}
   */
  onResize () {
    console.log(`WindowAdder has been resized`)
    return resolvedPromise(true)
  }

  postRender () {
    return new Promise( (resolve) => {
      $('#new-window').on('click', async () => {
        this.newWindows++
        let target =''
        let features = 'popup=yes,location=no,toolbar=no'
        let newWindowSpec = { // Second window
          target: target,
          features: features,
          style: extraStyles,
          containers: [ {
            type: CONTAINER_TYPE.GRID,
            id: `window${this.newWindows}`,
            childrenDirection: DIRECTION.VERTICAL,
            fullScreen: true,
            frames: [
              {
                type: FRAME_TYPE.RESIZABLE,
                component: new StaticContentComponent(`window${this.newWindows}-left`, `This is window number ${this.newWindows}`)
              },
              {
                type: FRAME_TYPE.RESIZABLE,
                component: new StaticContentComponent(`window${this.newWindows}-right`, generateSomeText())
              }
            ]

         }]
        }
        let index = app.addWindow(newWindowSpec)
        await app.renderWindow(index)
      })
    })
  }
}



const lorem = new LoremIpsum({})

function generateSomeText(numParagraphs = 3, wordsPerParagraph = 150, paragraphClasses = []) {
  return createIndexArray(numParagraphs).map( () => {
    let words = lorem.generateWords(wordsPerParagraph).split(' ').map( (word, index) => {
      if (index===0) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word.toLowerCase()
    }).join(' ')
    return `<p class="${paragraphClasses.join(' ')}">${words}.</p>`
  }).join('')
}





