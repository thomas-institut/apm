import Inline from 'quill/blots/inline'

const blotClassName = 'blot-numbering-label'

class NumberingLabel extends Inline {
  static create(value) {
    // console.log(`Creating numbering label with value ${value}`)
    let node = super.create()
    if (value) {
      if (node.className !== '') {
        node.className += ' '
      }
      node.className += blotClassName
    } else {
      node.className = this.removeClassFromString(node.className, blotClassName)
    }
    // console.log(`Node class name is now '${node.className}'`)
    return node
  }

  static formats(node) {
    return this.classExistsInClassString(node.className, blotClassName)
  }

  optimize(context) {
    super.optimize(context);
    if (this.domNode.tagName !== this.statics.tagName[0]) {
      this.replaceWith(this.statics.blotName);
    }
  }

  static removeClassFromString(originalClassString, classToRemove) {
    let classArray = originalClassString.split(' ')
    let newClassArray = []
    classArray.forEach( (className) => {
      if (className !== classToRemove) {
        newClassArray.push(className)
      }
    })
    return newClassArray.join(' ')
  }

  static classExistsInClassString(classString, className) {
    return classString.split(' ').indexOf(className) !== -1
  }
}

NumberingLabel.blotName = 'numberingLabel';
NumberingLabel.tagName = ['b'];

export default NumberingLabel;
