import { prettyPrintArray } from './ArrayUtil'

export function maximizeElementHeightInParent(element, parent, offset = 0, verbose = false) {
  let currentHeight = element.outerHeight()
  let parentHeight = parent.height()
  verbose && console.log(`Maximizing height: current ${currentHeight}, parent ${parentHeight}, offset ${offset}`)
  let newHeight = parentHeight - offset
  if (newHeight !== currentHeight) {
    element.outerHeight(newHeight)
  }
}

export function getClassArray(element) {
  if (element.attr('class') === undefined) {
    return []
  }
  return element.attr("class").split(/\s+/)
}


export function getIdFromClasses(element, prefix) {
  let classes = getClassArray(element)
  let id = -1
  let found = false
  classes.forEach( (theClass) => {
    if (found) {
      return
    }
    if (theClass.startsWith(prefix)) {
      let suffix = theClass.slice(prefix.length)
      if (suffix !== '' && isStringAnInteger(suffix)) {
        id = parseInt(suffix)
        found = true
      }
    }
  })
  return id
}

function isStringAnInteger(str) {
  return /^\d+$/.test(str);
}
