// @ts-ignore
import Inline from 'quill/blots/inline';

const blotClassName = 'blot-numbering-label';

const debug = true;

class NumberingLabel extends Inline {
  static create(value: any) {
    debug && console.log(`Creating numbering label with value ${value}`);
    let node = super.create();
    debug && console.log(node);
    if (value === true) {
      if (node.className !== '') {
        node.className += ' ';
      }
      node.className += blotClassName;
    } else {
      node.className = this.removeClassFromString(node.className, blotClassName);
    }
    debug && console.log(`Node class name is now '${node.className}'`);
    return node;
  }

  static formats(node: any) {
    return this.classExistsInClassString(node.className, blotClassName);
  }

  static removeClassFromString(originalClassString: string, classToRemove: string) {
    debug && console.log(`Removing class '${classToRemove}' from class string '${originalClassString}'`);
    let classArray = originalClassString.split(' ');
    let newClassArray: string[] = [];
    classArray.forEach((className) => {
      if (className !== classToRemove) {
        newClassArray.push(className);
      }
    });
    return newClassArray.join(' ');
  }

  static classExistsInClassString(classString: string, className: string) {
    return classString.split(' ').indexOf(className) !== -1;
  }

  optimize(context: any) {
    debug && console.log(`Optimizing numbering label`, context);

    super.optimize(context);
    // @ts-ignore
    if (this.domNode.tagName !== this.statics.tagName[0]) {
      // @ts-ignore
      this.replaceWith(this.statics.blotName);
    }
  }
}

// @ts-ignore
NumberingLabel.blotName = 'numberingLabel';
// @ts-ignore
NumberingLabel.tagName = ['b'];

export default NumberingLabel;
