import { Typesetter2 } from '../../Typesetter2/Typesetter2.mjs'

export const defaultHebrewEditionStyle = {
  strings : {
    omission: 'חסר',
    addition: 'נוסף',
    ante: 'לפני',
    post: 'אחרי',
    defaultLemmaSeparator: ']',
    lineRangeSeparator: '\u2016',  // double vertical line
    entrySeparator:  '\u007c' // single vertical line
  },
  formattingStyles: {
    default: {
      text: {
        fontFamily: 'Linux Libertine',
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
    hebrewText: {
    },
    latinText: {
      text: {
        fontFamily: 'FreeSerif'
      }
    },
    normal: {
      parent: 'default',
      paragraph: {
        indent: '1 em'
      }
    },
    h1: {
      parent: 'default',
      text: {
        fontSize: '1.5 em',
        fontWeight: 'bold',
      },
      paragraph: {
        align: 'center',
        spaceBefore: '2 em',
        spaceAfter: '1 em'
      }
    },
    h2: {
      parent: 'default',
      text: {
        fontSize: '1.2 em',
        fontWeight: 'bold',
      },
      paragraph: {
        spaceBefore: '1 em',
        spaceAfter: '0.5 em'
      }
    },
    h3: {
      parent: 'default',
      text: {
        fontWeight: 'bold',
      },
      paragraph: {
        spaceBefore: '0.5 em',
        spaceAfter: '0.25 em'
      }
    },
    apparatus: {
      parent: 'default',
      text: {
        fontSize: '0.9 em',
      }
    },
    postLineRangeSeparator: {
      text: {
        fontWeight: 'bold',
      }
    },
    afterLineRange: {
      glue: {
        width: '2.5 sp',
        stretch: '1 sp',
        shrink: '0.5 sp'
      }
    },
    preEntrySeparator : {
      glue: {
        width: '1 sp',
        stretch: '0.5 sp',
        shrink: '0.1 sp'
      }
    },
    entrySeparator: {
      // text: {
      //   fontWeight: 'bold',
      // }
    },
    postEntrySeparator: {
      glue: {
        width: '2.5 sp',
        stretch: '1.5 sp',
        shrink: '0.5 sp'
      }
    },
    apparatusLineNumbers: {
      text: {
        fontWeight: 'bold',
      }
    },
    apparatusKeyword: {
      text: {
        fontSize: '0.8 em',
      }
    }
  }
}