import Inline from 'quill/blots/inline'

const blotClassName = 'blot-paragraph-number'

class ParagraphNumber extends Inline {
  static create(value) {
    let node = super.create()
    if (value) {
      node.className += ` ${blotClassName}`
    } else {
      node.className = this.removeClassFromString(node.className, blotClassName)
    }
    return node
  }

  static formats(node) {
    return this.classExistsInClassString(node.className)
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

  static classExistsInClassString(classString) {
    return classString.split(' ').indexOf(classString)
  }
}

ParagraphNumber.blotName = 'paragraphNumber';
ParagraphNumber.tagName = ['b'];

export default ParagraphNumber;
