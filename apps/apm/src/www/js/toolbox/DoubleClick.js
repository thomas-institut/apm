
const defaultDoubleClickDelayInMs = 500

/**
 *
 * @param jQueryElement
 * @param {function} onClickFunction
 * @param { function } onDoubleClickFunction
 * @param {boolean} actionOnFirstClick  if true, the click function will be called as soon as a 1st click is detected,
 *    if false, only after the double click timer expires
 * @param {number} doubleClickDelay
 */
export function onClickAndDoubleClick( jQueryElement, onClickFunction, onDoubleClickFunction, actionOnFirstClick = true, doubleClickDelay = defaultDoubleClickDelayInMs) {

  let waitingForSecondClick = false
  let timerId = null

  jQueryElement.on('dblclick', (ev) => {
    // console.log(`Double click event (ignoring)`)
    // console.log(ev.target)
    ev.preventDefault()
    ev.stopPropagation()
  })
    .on('click', (ev) => {
      // console.log(`Click event, waiting for second click: ${waitingForSecondClick}, timerId: ${timerId}`)
      ev.preventDefault()
      ev.stopPropagation()
      if (waitingForSecondClick) {
        // double click
        if (timerId !== null) {
          clearTimeout(timerId)
        } else {
          console.warn(`Double click detected but no timer set!`)
        }
        onDoubleClickFunction(ev)
        waitingForSecondClick = false
      } else {
        waitingForSecondClick = true
        if (actionOnFirstClick) {
          onClickFunction(ev)
        }
        timerId = setTimeout( () => {
          if (!actionOnFirstClick) {
            onClickFunction(ev)
          }
          waitingForSecondClick = false
        }, doubleClickDelay)
      }
  })
}