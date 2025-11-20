// @ts-ignore
import Inline from 'quill/blots/inline';

class Small extends Inline {
  static create() {
    return super.create();
  }

  static formats() {
    return true;
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
Small.blotName = 'small';
// @ts-ignore
Small.tagName = ['SMALL'];

export default Small;

