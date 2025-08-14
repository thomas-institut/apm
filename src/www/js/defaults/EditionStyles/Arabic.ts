// noinspection ES6PreferShortImport

import {StyleSheetDefinition} from "../../lib/Typesetter2/Style/StyleSheet.js";

export const defaultArabicEditionStyle: StyleSheetDefinition = {
  _metaData: {
    name: 'Default', description: 'A4 paper, Noto Naskh'
  },
  default: {
    strings: {
      omission: 'نقص',
      addition: 'ز',
      ante: 'قبل',
      post: 'بعد',
      defaultLemmaSeparator: ']',
      lineRangeSeparator: '\u2016',  // double vertical line
      entrySeparator: '\u007c' // single vertical line
    }, page: {
      width: '21 cm',
      height: '29.7 cm',
      marginTop: '2 cm',
      marginLeft: '3 cm',
      marginBottom: '2 cm',
      marginRight: '3 cm',
      minDistanceFromApparatusToText: '15 pt',
      minInterApparatusDistance: '15 pt',
      lineNumbers: 'arabic',   //  "western", "arabic", "none"
      lineNumbersToTextDistance: '0.5 cm',
      lineNumbersFontSize: '0.9 em',
      lineNumbersPosition: 'right',
      resetLineNumbersEachPage: true
    }, paragraph: {
      lineSkip: '18 pt', indent: '0', align: 'justified', spaceBefore: '0', spaceAfter: '0'
    }, text: {
      fontFamily: 'Noto Naskh Arabic', fontSize: '12 pt', fontStyle: '', fontWeight: '', shiftY: '0'
    }, glue: {
      width: '0.23 em', shrink: '0.03 em', stretch: '0.07 em'
    },
  },
  emGlue: {
    parent: '', glue: {
      width: '1 em', shrink: '0.02 em', stretch: '0.08 em'
    }
  },
  small: {
    parent: '', text: {
      fontSize: '0.8 em'
    }
  },
  superscript: {
    parent: '', text: {
      fontSize: '0.7 em', shiftY: '-0.6 em'
    }
  },
  subscript: {
    parent: '', text: {
      fontSize: '0.7 em', shiftY: '0.6 em'
    }
  }, arabicText: {
    parent: '',
  }, latinText: {
    parent: '', text: {
      fontFamily: 'FreeSerif'
    }
  }, normal: {
    parent: 'default', paragraph: {
      indent: '1.5 em'
    }
  }, h1: {
    parent: 'default', text: {
      fontSize: '1.5 em', fontWeight: 'bold',
    }, paragraph: {
      align: 'center', spaceBefore: '2 em', spaceAfter: '1 em'
    }
  }, h2: {
    parent: 'default', text: {
      fontSize: '1.2 em', fontWeight: 'bold',
    }, paragraph: {
      spaceBefore: '1 em', spaceAfter: '0.5 em'
    }
  }, h3: {
    parent: 'default', text: {
      fontWeight: 'bold',
    }, paragraph: {
      spaceBefore: '0.5 em', spaceAfter: '0.25 em'
    }
  }, apparatus: {
    parent: 'default', text: {
      fontSize: '10 pt',
    }, paragraph: {
      lineSkip: '15 pt'
    }, glue: {
      width: '0.23 em', shrink: '0.03 em', stretch: '0.07 em'
    },
  }, lineRangeSeparator: {
    text: {
      fontWeight: 'bold',
    }
  }, postLineRangeSeparator: {
    glue: {
      width: '0.23 em', shrink: '0.03 em', stretch: '0.2 em'
    }
  }, preEntrySeparator: {
    glue: {
      width: '0.23 em', shrink: '0.03 em', stretch: '0.14 em'
    }
  }, entrySeparator: {
    // text: {
    //   fontWeight: "bold",
    // }
  }, postEntrySeparator: {
    glue: {
      width: '0.23 em', shrink: '0.03 em', stretch: '0.14 em'
    }
  }, apparatusLineNumbers: {
    text: {
      fontWeight: 'bold',
    }
  }, apparatusKeyword: {
    text: {
      fontSize: '0.8 em',
    }
  }, sigla: {
    // no special format in Arabic
  }, hand: {
    parent: 'superscript'
  }, marginalia: {
    parent: 'default', text: {
      fontSize: '9 pt',
    }, paragraph: {
      lineSkip: '15 pt'
    }, glue: {
      width: '0.23 em', shrink: '0.03 em', stretch: '0.07 em'
    },
  }, marginaliaKeyword: {
    text: {
      fontStyle: 'italic',
    }
  },
}