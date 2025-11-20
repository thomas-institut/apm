// @ts-ignore
import Inline from 'quill/blots/inline';

const blotClassName = 'blot-sigla';

class Sigla extends Inline {
  static create(value: any) {
    console.log(`Creating sigla string with value=${value}`);
    let node = super.create();
    if (value) {
      if (node.className !== '') {
        node.className += ' ';
      }
      node.className += blotClassName;
    } else {
      node.className = this.removeClassFromString(node.className, blotClassName);
    }
    // console.log(`Node class name is now '${node.className}'`)
    return node;
  }

  static formats(node: any) {
    return this.classExistsInClassString(node.className, blotClassName);
  }

  static removeClassFromString(originalClassString: string, classToRemove: string) {
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
    super.optimize(context);
    // @ts-ignore
    if (this.domNode.tagName !== this.statics.tagName[0]) {
      // @ts-ignore
      this.replaceWith(this.statics.blotName);
    }
  }
}

// @ts-ignore
Sigla.blotName = 'sigla';
// @ts-ignore
Sigla.tagName = ['b'];

export default Sigla;
