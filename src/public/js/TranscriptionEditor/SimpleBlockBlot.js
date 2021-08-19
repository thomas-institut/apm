

import Block from 'quill/blots/block'

class SimpleBlockBlot extends Block
{
  static formats()
  {
    return true
  }
}
SimpleBlockBlot.tagName = 'p'