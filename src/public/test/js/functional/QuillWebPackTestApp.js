import Quill from '../../../js/QuillLoader'

$( () => {

  let containerSelector = '#editor'


  let quill = new Quill(containerSelector, {
    modules: {
      keyboard: {
        bindings: {

        }
      }
    }
  })

  console.log(quill.keyboard)

  let buttons = [ 'bold', 'italic']

  quill.on('selection-change', (range, oldRange, source) => {
    if (oldRange === null) {
      oldRange = { index: -1, length: -1}
    }
    console.log(`Selection change from ${oldRange.index}:${oldRange.length} to ${range.index}:${range.length}, source ${source}`)
    let currentFormat = quill.getFormat()
    buttons.forEach( (fmt) => {
      let btn = $(`#${fmt}-btn`)
      setButtonState(btn, currentFormat[fmt])
    })
  })
  $('#bold-btn').on('click', genOnClickFormat('bold', quill, '#bold-btn'))
  $('#italic-btn').on('click', genOnClickFormat('italic', quill, '#italic-btn'))

})

function setButtonState(btn, state) {
  if (state) {
    btn.addClass('on')
  } else {
    btn.removeClass('on')
  }
}

function genOnClickFormat(format, quill, buttonSelector) {
  return () => {
    let currentFormat = quill.getFormat()
    console.log(currentFormat)
    let currentState = currentFormat[format]
    let btn = $(buttonSelector)
    quill.format(format, !currentState)
    currentState = !currentState
    setButtonState(btn, currentState)
  }
}



