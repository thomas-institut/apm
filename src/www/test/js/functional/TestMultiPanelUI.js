import { MultiPanelUI}  from '../../../js/MultiPanelUI/MultiPanelUI'
import * as GetLorem from 'getlorem'
import { EditableTextField } from '../../../js/widgets/EditableTextField'

let currentPanelOneSize = 'N/A'
let currentPanelMode = 'N/A'
const homeTabId = 'home'
const infoTabId = 'info'
const loremOneTabId = 'lorem-1'
const loremTwoTabId = 'lorem-2'

let loremIpsum1 = GetLorem.paragraphs(3, 'p', true)
let loremIpsum2 =  GetLorem.paragraphs(3, 'p')

function genPanelOneOnResizeAndRender() {
  return (id, mode) => {
    let thePanel = $(`#${id}`)
    currentPanelOneSize = `${thePanel.width()} x ${thePanel.height()}`
    currentPanelMode = mode
    $(`#${infoTabId}`).html(genInfoTabHtml(currentPanelOneSize, currentPanelMode))
}}

function genInfoTabHtml(currentSize, mode) {
  return `<p>Current size: ${currentSize}</p><p>Mode: '${mode}'</p>`
}

$( () => {



  let multiPanelUI = new MultiPanelUI({
    logo: `<img src="../../../images/apm-logo-plain.svg" height="40px" alt="logo"/>`,
    topBarContent: () => {
      return `<div class="top-bar-item top-bar-title" id="page-title">Multi-panel User Interface</div>`
    },
    topBarRightAreaContent: () => {
      return `<span id="save-info">Last Save: N/A</span><button id="save-button" class="btn btn-sm btn-primary">Save</button>`
    },
    panels: [
      {
        id: 'panel-one',
        type: 'tabs',
        tabs: [
            { id: homeTabId, title: 'Home', content: () => 'This is the first tab'},
            { id: loremOneTabId, title: 'Lorem Ipsum 1', content: () => loremIpsum1, contentClasses: ['lorem']},
            {
              id: infoTabId,
              title: 'Info',
              content: () => genInfoTabHtml(currentPanelOneSize, currentPanelMode),
              onResize: genPanelOneOnResizeAndRender(),
              postRender: genPanelOneOnResizeAndRender()
            },
            { id: loremTwoTabId, title: 'Lorem Ipsum 2', content: () => loremIpsum2, contentClasses: ['lorem', 'lorem-2']},
        ]
      },
      {
        id: 'panel-two',
        type: 'tabs',
        tabs: [
          {
            id: 'apples',
            title: 'Apples',
            content: generateAppleTabHtml,
            postRender:  postRenderAppleTab,
            onResize: onAppleTabResize
          },
          {
            id: 'pears',
            title: 'Pirum Ipsum',
            contentClasses: [ 'lorem'],
            content: () => { return loremIpsum1}
          },
          {
            id: 'bananas',
            title: 'Bananas',
            linkTitle: 'Click to go crazy!',
            tabClasses: [ 'banana-link'],
            content: () => { return 'This is the banana tab'},
            postRender: () => { console.log('Bananas rendered')}
          }
        ],
        postRender: () => { console.log('Fruit panel rendered')},
      }
    ]
    }
  )
  const titleHoverClass = 'text-muted'
  multiPanelUI.start().then( () => {
    new EditableTextField({
      containerSelector: '#page-title',
      initialText: 'MultiPanel UI Test',
      editIcon: '<i class="bi bi-pencil"></i>',
      confirmIcon: '<i class="bi bi-check"></i>',
      cancelIcon: '<i class="bi bi-x"></i>'
    })
  })
})


let appleTextInput = 'Some text to edit'
let numAppleResizes = 0

function onAppleTabResize() {
  numAppleResizes++
  $('#apple-resizes-label').html(timesLabel(numAppleResizes))
}

function timesLabel(count) {
  return `${count} ${count===1 ? 'time' : 'times'}`
}

function generateAppleTabHtml() {
  return `<p>This is the apple tab. Below there's some text that you can edit as you wish.</p>
<div id="apple-text" class="text-muted"></div>
<p>This tab has been resized <span id="apple-resizes-label">${timesLabel(numAppleResizes)}</span>.</p>`

}

function postRenderAppleTab() {
  new EditableTextField({
    containerSelector: '#apple-text',
    initialText: appleTextInput,
    onConfirm: (data) => {
      appleTextInput = data.detail.newText
      console.log(`Confirming new apple text: '${appleTextInput}'`)
    },
    editIcon: '<i class="bi bi-pencil-fill"></i>',
    confirmIcon: '<i class="bi bi-check-lg"></i>',
    cancelIcon: '<i class="bi bi-x-lg"></i>'
  })
}