import { Typesetter2 } from '../Typesetter2.mjs'

export const defaultStyleSheet = {
  default: {
    parent: '',
    text: {
      fontFamily: 'FreeSerif',
      fontSize: Typesetter2.pt2px(12),
      fontStyle: '',
      fontWeight: '',
      shiftY: 0
    },
    paragraph: {
      lineSkip: '1.25 em',
      indent: 0,
      align: 'justified',
      spaceBefore: 0,
      spaceAfter: 0
    },
    glue: {
      width: '1 sp',
      shrink: '0.16667 sp',
      stretch: '0.33333 sp'
    }
  },
  latinText: {
    parent: ''
  },
  arabicText: {
    parent: '',
    text: {
      fontFamily: 'Noto Naskh Arabic'
    }
  },
  hebrewText: {
    parent: '',
    text: {
      fontFamily: 'Linux Libertine'
    }
  },
  greekText: {
    parent: '',
    text: {
      fontFamily: 'Linux Libertine'
    }
  },
  normal:  {  // an alias
    parent: 'default'
  },
  small:  {
    parent: '',
    text: {
      fontSize: '0.8 em'
    }
  },
  superscript: {
    parent: '',
    text: {
      fontSize: '0.7 em',
      shiftY: '-0.6 em'
    }
  },
  subscript:  {
    parent: '',
    text: {
      fontSize: '0.7 em',
      shiftY: '0.6 em'
    }
  }
}

