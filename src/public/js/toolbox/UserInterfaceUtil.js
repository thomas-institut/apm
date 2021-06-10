

export function maximizeElementHeightInParent(element, parent, offset = 0, verbose = false) {
  let currentHeight = element.outerHeight()
  let parentHeight = parent.height()
  verbose && console.log(`Maximizing height: current ${currentHeight}, parent ${parentHeight}, offset ${offset}`)
  let newHeight = parentHeight - offset
  if (newHeight !== currentHeight) {
    element.outerHeight(newHeight)
  }
}
