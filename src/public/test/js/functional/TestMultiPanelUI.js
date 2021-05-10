import { MultiPanelUI}  from '../../../js/multi-panel-ui/MultiPanelUI'
import { BootstrapTabGenerator } from '../../../js/multi-panel-ui/BootstrapTabGenerator'
import * as GetLorem from 'getlorem'
import { prettyPrintArray, shuffleArray } from '../../../js/toolbox/ArrayUtil'

let currentPanelOneSize = 'N/A'
let currentPanelMode = 'N/A'
const homeTabId = 'home'
const infoTabId = 'info'
const loremOneTabId = 'lorem-1'
const loremTwoTabId = 'lorem-2'
const panelOneTabsId = 'panel-one-tabs'
const panelOneTabsContent = 'panel-one-tabs-content'

let currentActiveTab = homeTabId

let dragging = false
let currentTabs = []
let currentOrder = []
let dragId = ''
let dragIndex = -1

let loremIpsum1 = GetLorem.paragraphs(3, 'p', true)
let loremIpsum2 =  GetLorem.paragraphs(3, 'p')



let tabGenerator1 = new BootstrapTabGenerator({
  id: panelOneTabsId,
  activeTabId: homeTabId,
  tabs:  [
    { id: homeTabId, title: 'Home', content: () => 'This is the first tab'},
    { id: loremOneTabId, title: 'Lorem Ipsum 1', content: () => loremIpsum1, contentClasses: ['lorem']},
    { id: infoTabId, title: 'Info', content: () => genInfoTabHtml(currentPanelOneSize, currentPanelMode) },
    { id: loremTwoTabId, title: 'Lorem Ipsum 2', content: () => loremIpsum2, contentClasses: ['lorem', 'lorem-2']},
  ],
  order: [0, 1, 2, 3]
})




function setupDraggingEventHandlers() {
  $(`#${panelOneTabsId} .nav-link`).on('dragstart', (ev) => {
    currentTabs = tabGenerator1.getTabIds()
    dragging = true
    dragId = getPanelIdFromTabId(ev.target.id)
    dragIndex = currentTabs.indexOf(dragId)
    currentOrder = tabGenerator1.order
    $(ev.target).addClass('dragged')
    // console.log(`Starting dragging for id ${dragId} at position ${dragIndex}`)
    // console.log(`Current tabs:  ${prettyPrintArray(currentTabs)}`)
    // console.log(`Current order: ${prettyPrintArray(currentOrder)}`)
  }).on('dragend', (ev) => {
    dragging = false
    $(ev.target).removeClass('dragged')
  })

  $(`#panel-one-tabs`).on('dragenter', (ev)=> {
    if (!dragging) {
      return
    }
    let element = $(ev.target)
    if (element.hasClass('nav-link')) {
      let tabId = getPanelIdFromTabId(element.attr('id'))
      if (tabId === dragId) {
        //console.log(`drag enter on same tab`)
        return
      }

      //console.log(`Drag enter on tab ${element.attr('id')}`)
      let index = currentTabs.indexOf(tabId)
      if (index === -1) {
        console.log(`Hmm, a -1 index found in tabs this should not happen`)
        return
      }
      if (index === dragIndex + 1 ) {
        // entering the next tab in the list, nothing to do
        return
      }
      $(ev.target).addClass('dragging')
      return
    }
    if (element.hasClass('nav-tabs')) {
      //console.log(`Drag enter on tab div`)
      $(`#${currentTabs[currentTabs.length-1]}-tab`).addClass('dragging-last')
      return
    }
    console.log('Drag enter')
    console.log(ev.target)
  }).on('dragleave', (ev) => {
    if (!dragging) {
      return
    }
    let element = $(ev.target)
    if (element.hasClass('nav-link')) {
      let tabId = getPanelIdFromTabId(element.attr('id'))
      if (tabId === dragId) {
        //console.log(`drag leave on same tab`)
        return
      }
      //console.log(`-- Drag leave on tab ${element.attr('id')}`)
      $(ev.target).removeClass('dragging')
      return
    }
    if (element.hasClass('nav-tabs')) {
      //console.log(`-- Drag leave on tab div`)
      $(`#${currentTabs[currentTabs.length-1]}-tab`).removeClass('dragging-last')
      return
    }
    console.log('-- Drag leave')
    console.log(ev.target)
  }).on('drop', (ev) => {
    if (!dragging) {
      return
    }
    ev.preventDefault()
    let element = $(ev.target)
    if (element.hasClass('nav-link')) {
      let tabId = getPanelIdFromTabId(element.attr('id'))
      if (tabId === dragId) {
        //console.log(`dropping on the same tab`)
        return
      }

      console.log(`Drop on tab ${element.attr('id')}`)
      let index = currentTabs.indexOf(tabId)
      if (index === -1) {
        console.log(`Hmm, a -1 index found in tabs this should not happen`)
        return
      }
      if (index === dragIndex + 1 ) {
        // dropping on the next tab in the list, nothing to do
        return
      }
      console.log(`Moving tab from position ${dragIndex} to before tab in position ${index}`)
      let newOrder = moveTabIndex(currentOrder, dragIndex, index)
      console.log(`New order: ${prettyPrintArray(newOrder)}`)
      $(ev.target).removeClass('dragging')

      tabGenerator1.setActive(getActiveTab(currentTabs))
      tabGenerator1.setOrder(newOrder)
      $(`#${panelOneTabsId}`).replaceWith(tabGenerator1.generateTabListHtml())
      setupDraggingEventHandlers()
      return
    }
    if (element.hasClass('nav-tabs')) {
      console.log(`Drop on tab div`)
      $(`#${currentTabs[currentTabs.length-1]}-tab`).removeClass('dragging-last')
      let index = currentTabs.length
      console.log(`Moving tab from position ${dragIndex} the end, (index = ${index})`)
      let newOrder = moveTabIndex(currentOrder, dragIndex, index)
      console.log(`New order: ${prettyPrintArray(newOrder)}`)
      tabGenerator1.setActive(getActiveTab(currentTabs))
      tabGenerator1.setOrder( newOrder)
      $(`#${panelOneTabsId}`).replaceWith(tabGenerator1.generateTabListHtml())
      setupDraggingEventHandlers()
      return
    }
    console.log(`Drop on other element`)
    console.log(ev)
  }).on('dragover', (ev) => {
    ev.preventDefault()
  })
}

function moveTabIndex(currentOrder, tabIndexToMove, nextTabIndex) {
  let newOrder = []
  if (tabIndexToMove === nextTabIndex) {
    return currentOrder
  }
  if (nextTabIndex > tabIndexToMove) {
    for (let i = 0; i < tabIndexToMove; i++) {
      newOrder.push(currentOrder[i])
    }
    for (let i = tabIndexToMove +1; i < nextTabIndex; i++) {
      newOrder.push(currentOrder[i])
    }
    newOrder.push(currentOrder[tabIndexToMove])
    for (let i = nextTabIndex; i < currentOrder.length; i++) {
      newOrder.push(currentOrder[i])
    }
    return newOrder
  }

  for (let i = 0; i < nextTabIndex; i++) {
    newOrder.push(currentOrder[i])
  }
  newOrder.push(currentOrder[tabIndexToMove])
  for (let i = nextTabIndex; i < tabIndexToMove ; i++) {
    newOrder.push(currentOrder[i])
  }
  for (let i = tabIndexToMove+1; i < currentOrder.length; i++) {
    newOrder.push(currentOrder[i])
  }
  return newOrder

}

function genPanelOneOnResizeAndRender(postRender = false) {
  return (id, mode) => {
    let thePanel = $(`#${id}`)
    currentPanelOneSize = `${thePanel.width()} x ${thePanel.height()}`
    currentPanelMode = mode
    $(`#${infoTabId}`).html(genInfoTabHtml(currentPanelOneSize, currentPanelMode))
    let tabsContentDiv = $(`#${panelOneTabsContent}`)
    maximizeElementHeightInParent(tabsContentDiv, thePanel, $(`#${panelOneTabsId}`).outerHeight())
    maximizeElementHeightInParent($(`#${loremOneTabId}`), tabsContentDiv,0)
    maximizeElementHeightInParent($(`#${loremTwoTabId}`), tabsContentDiv,0)
    if (postRender) {
      $(`#${currentActiveTab}`).tab('show')
      $('a[data-toggle="tab"]').on('shown.bs.tab', function (event) {
        //console.log(`Tab shown: ${event.target.id}, previous: ${event.relatedTarget.id}`)
        currentActiveTab = event.target.id
        //console.log(event.target) // newly activated tab
        //event.relatedTarget // previous active tab
      })
      setupDraggingEventHandlers()
  }
}}

function maximizeElementHeightInParent(element, parent, offset) {
  let currentHeight = element.outerHeight()
  let parentHeight = parent.height()
  //console.log(`Maximizing height: current ${currentHeight}, parent ${parentHeight}, offset ${offset}`)
  let newHeight = parentHeight - offset
  if (newHeight !== currentHeight) {
    element.outerHeight(newHeight)
  }
}

function genInfoTabHtml(currentSize, mode) {
  return `<p>Current size: ${currentSize}</p><p>Mode: '${mode}'</p>`
}

$( () => {

  let numAppleResizes = 0

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
        type: 'simple',
        content: (panelId, mode) => { return tabGenerator1.generateHtml()},
        postRender: genPanelOneOnResizeAndRender(true),
        onResize: genPanelOneOnResizeAndRender(false)
      },
      {
        id: 'panel-two',
        type: 'tabs',
        tabs: [
          {
            id: 'apples',
            title: 'Apples',
            content: () => { return 'This is the apple tab'},
            onResize: () => { console.log(`Apples resized ${++numAppleResizes} times`)}
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
  multiPanelUI.start().then( () => {
    $('#page-title').on('click', ()=>{
      console.log(`Click on page title`)
    })
  })


})

function getPanelIdFromTabId(tabId) {
  return tabId.replace('-tab', '')
}


function getActiveTab(tabArray) {
  for (let i=0; i < tabArray.length; i++) {
    if ($(`#${tabArray[i]}-tab`).hasClass('active')) {
      return tabArray[i]
    }
  }
  return ''
}

