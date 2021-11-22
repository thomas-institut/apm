import Inline from 'quill/blots/inline'

class Superscript extends Inline {
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

Superscript.blotName = 'superscript';
Superscript.tagName = ['sup'];

export default Superscript;

