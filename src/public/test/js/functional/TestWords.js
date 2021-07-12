import { getIntegerSuffix } from '../../../js/toolbox/Util.mjs'
import { InlineSimpleTextEditor } from '../../../js/widgets/InlineSimpleTextEditor'

const initialText = "This is a test of a user interface for manipulating attributes of a number of word tokens"
const tokenAreaDivId = 'token-area'


let divElementSelector = `#${tokenAreaDivId}`
let tokens = getTokensFromString(initialText)


let tokenIndexOne = -1
let tokenIndexTwo = -1
let selecting = false
let cursorInToken = false
let editing = false

let selection = { from: -1, to: -1}


$( () => {

  let divElement = $(divElementSelector)

  renderTokens(divElement, tokens)
  setUpEventHandlers(divElement)
  processNewSelection(selection)
})


function getTokensFromString(theString) {
  return theString.split(' ').map( (word, index) => {
    return {
      'text': word,
      'type': 'word',
    }
  })
}

function getTokensHtml(tokens) {
  return tokens.map( (token, index) => {
    return `<span class="token token-${index} token-type-${token.type}">${token.text}</span><span class="whitespace token-ws-${index}"> </span>`
  }).join('')
}

function renderTokens(divElement, tokens) {
  divElement.html(getTokensHtml(tokens))
}

function setUpEventHandlers(divElement) {


  divElement
    .on('click', genOnClickDiv())
    .on('mousedown', (ev) => { ev.preventDefault()})
    .on('mouseleave', genOnMouseLeaveDiv())
  divElement.children('.token')
    .on(`mouseenter`, genOnMouseEnterToken())
    .on(`mouseleave`, genOnMouseLeaveToken())
    .on(`mousedown`, genOnMouseDownToken())
    .on(`mouseup`, genOnMouseUpToken())
    .on(`click`, genOnClickToken())
}



function processNewSelection() {
  let infoDiv =  $(`#info1`)
  if (selection.from === -1) {
   infoDiv.html(`No selection`)
    return
  }
  infoDiv.html(`Selected text: '${getSelectionText(tokens, selection)}'`)
}


function startSelecting() {
  selecting = true
}

function stopSelecting() {
  selecting = false
  processNewSelection(selection)
}

function genOnClickDiv() {
  return (ev) => {
    if (editing) {
      return
    }
    if (cursorInToken) {
      return
    }
    if (!selecting) {
      clearSelection()
    }
  }
}

function genOnClickToken() {
  return (ev) => {
    ev.stopPropagation()
  }
}

function setSelection(token1, token2) {
  selection = {
    from: Math.min(token1, token2),
    to: Math.max(token1, token2)
  }
}

function genOnMouseDownToken() {
  return (ev) => {
    if (editing) {
      return
    }

    ev.preventDefault()
    tokenIndexOne = getTokenIndexFromClassList(getClassList($(ev.target)))
    console.log(`Mouse down on token ${tokenIndexOne}`)
    if (selection.from === selection.to && selection.from === tokenIndexOne) {
      console.log(`Second click on a single word selection, token index ${tokenIndexOne}`)
      stopSelecting()
      editing = true
      let tokenIndex = tokenIndexOne
      let tokenSpanSelector =  `span.token.token-${tokenIndex}`
      $(tokenSpanSelector).removeClass('token-selected')
      new InlineSimpleTextEditor({
        containerSelector: tokenSpanSelector,
        initialText: tokens[tokenIndex].text,
        onCancel: () => {
          $(tokenSpanSelector).html(tokens[tokenIndex].text)
          setSelection(tokenIndex, tokenIndex)
          showSelectionInBrowser()
          editing = false
        },
        onConfirm: (newText) => {
          tokens[tokenIndex].text = newText
          $(tokenSpanSelector).html(tokens[tokenIndex].text)
          setSelection(tokenIndex, tokenIndex)
          showSelectionInBrowser()
          editing = false
        }
      })
    } else {
      setSelection(tokenIndexOne, tokenIndexOne)
      showSelectionInBrowser()
      processNewSelection()
      startSelecting()
    }
  }
}

function genOnMouseUpToken() {
  return (ev) => {
    if (editing) {
      return
    }
    ev.preventDefault()
    let tokenIndex = getTokenIndexFromClassList(getClassList($(ev.target)))
    if (tokenIndex === -1) {
      console.log(`Mouse up on a token -1`)
      return
    }
    tokenIndexTwo = tokenIndex
    console.log(`Mouse up on token ${tokenIndexTwo}`)
    setSelection(tokenIndexOne, tokenIndexTwo)
    showSelectionInBrowser()
    stopSelecting()
  }
}

function genOnMouseLeaveDiv() {
  return (ev) => {
    if (editing) {
      return
    }
    if (selecting) {
      stopSelecting()
    }
  }
}

function genOnMouseEnterToken() {
  return (ev) => {
    if (editing) {
      return
    }
    cursorInToken = true
    if (selecting) {
      tokenIndexTwo =  getTokenIndexFromClassList(getClassList($(ev.target)))
      console.log(`Mouse enter on token ${tokenIndexTwo}`)
      setSelection(tokenIndexOne, tokenIndexTwo)
      showSelectionInBrowser()
      processNewSelection()
    }
  }
}

function genOnMouseLeaveToken() {
  return (ev) => {
    if (editing) {
      return
    }
    cursorInToken = false
  }
}

function showSelectionInBrowser() {
  clearSelectionInBrowser()
  for (let i=selection.from; i <=selection.to; i++) {
    $(`.token.token-${i}`).addClass('token-selected')
    if (i !== selection.to) {
      $(`.whitespace.token-ws-${i}`).addClass('token-selected')
    }
  }
}

function clearSelectionInBrowser() {
  $('.token').removeClass('token-selected')
  $('.whitespace').removeClass('token-selected')
}

function clearSelection() {
  setSelection(-1, -1)
  clearSelectionInBrowser()
  processNewSelection(selection)
}

function genReportTargetEventHandler (eventType) {
  return (ev) => {
    let msg = `${eventType} `


    let target = $(ev.target)
    if (target.hasClass('token')) {
      msg += `on token ${getTokenIndexFromClassList(getClassList(target))}`
      console.log(msg)
    } else {
      console.log(msg)
      console.log(ev.target)
    }

  }
}

function getTokenIndexFromClassList(classList) {
  if (classList.indexOf('token') !== -1 ) {
    for (let i = 0; i < classList.length; i++) {
      let intSuffix = getIntegerSuffix(classList[i], 'token-')
      if (intSuffix !== null) {
        return intSuffix
      }
    }
  }
  return -1
}

function getClassList(element) {
  if (element.attr('class') === undefined) {
    return []
  }
  return element.attr("class").split(/\s+/)
}

function getSelectionText(tokens, selection) {
  let selectedWords = []
  for (let i = selection.from; i <=selection.to; i++) {
    selectedWords.push(tokens[i].text)
  }
  return selectedWords.join(' ')
}