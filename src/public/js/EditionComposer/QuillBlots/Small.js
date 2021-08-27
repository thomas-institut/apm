import Inline from 'quill/blots/inline'

class Small extends Inline {
  static create() {
    return super.create();
  }

  static formats() {
    return true;
  }

  optimize(context) {
    super.optimize(context);
    if (this.domNode.tagName !== this.statics.tagName[0]) {
      this.replaceWith(this.statics.blotName);
    }
  }
}

Small.blotName = 'small';
Small.tagName = ['SMALL'];

export default Small;

