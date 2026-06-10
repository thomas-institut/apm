// noinspection ES6PreferShortImport

import {StyleSheetDefinition} from "@thomas-inst/typesetter";


export const latinPeetersEdition: StyleSheetDefinition =  {
  _metaData: {
    name: 'Peeters Edition',
    description: 'Format for editions published by Peeters'
  },
  fontConversions: [
    {
      from: { script: 'ar' },
      to: { fontFamily: 'Amiri', fontSizeFactor: 0.9 }
    },
    {
      from: { script: 'he' },
      to: { fontFamily: 'SBL Hebrew'}
    }
  ],
  default: {
    strings: {
      omission: 'om.',
      addition: 'add.',
      ante: 'ante',
      post: 'post',
      defaultLemmaSeparator: ']',
      lineRangeSeparator: '\u2016',  // double vertical line
      entrySeparator:  '\u007c' // single vertical line
    },
    page: {
      width: "16 cm",
      height: "24 cm",
      marginTop: "3.1579 cm",
      marginLeft: "3.2 cm",
      marginBottom: "2.9223 cm",
      marginRight: "2.3 cm",
      minDistanceFromApparatusToText: "26 pt",
      minInterApparatusDistance: "13 pt",
      lineNumbers: "western",   //  "western", "arabic", "none"
      lineNumbersToTextDistance: "0.5 cm",
      lineNumbersFontSize: "0.8 em",
      lineNumbersPosition: "right",
      resetLineNumbersEachPage: false
    },
    paragraph: {
      lineSkip: "13 pt",
      indent: "4 mm",
      align: 'justified',
      spaceBefore: "0",
      spaceAfter: "0"
    },
    text: {
      fontFamily: "Baskerville Pro",
      fontSize: "11 pt",
      fontStyle: "",
      fontWeight: "",
      shiftY: "0"
    },
    glue: {
      width: "0.25 em",
      shrink: "0.03 em",
      stretch: "0.08 em"
    },
  },
  emGlue: {
    parent: "",
    glue: {
      width: "1 em",
      shrink: "0.02 em",
      stretch: "0.08 em"
    }
  },
  small:  {
    parent: "",
    text: {
      fontSize: "0.8 em"
    }
  },
  superscript: {
    parent: "",
    text: {
      fontSize: "0.7 em",
      shiftY: "-0.6 em"
    }
  },
  subscript:  {
    parent: "",
    text: {
      fontSize: "0.7 em",
      shiftY: "0.6 em"
    }
  },
  normal: {
    parent: 'default',
    paragraph: {
      indent: '1 em'
    }
  },
  arabicText: {
    parent: "",
    text: {
      fontFamily: "Noto Naskh Arabic",
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
      spaceAfter: '1 em',
      keepWithNext: true
    }
  },
  h2: {
    parent: 'default',
    text: {
      fontSize: '1.2 em',
      fontWeight: 'bold',
    },
    paragraph: {
      align: 'center',
      spaceBefore: '1 em',
      spaceAfter: '0.5 em',
      keepWithNext: true
    }
  },
  h3: {
    parent: 'default',
    text: {
      fontWeight: 'bold',
    },
    paragraph: {
      align: 'center',
      spaceBefore: '0.5 em',
      spaceAfter: '0.25 em',
      keepWithNext: true
    }
  },
  apparatus: {
    parent: "default",
    text: {
      fontSize: "8.5 pt",
    },
    paragraph: {
      lineSkip: "9.5 pt"
    },
    glue: {
      width: "0.25 em",
      shrink: "0.03 em",
      stretch: "0.08 em"
    },
  },
  lineRangeSeparator: {
    text: {
      fontWeight: 'bold',
    }
  },
  postLineRangeSeparator: {
    glue: {
      width: "1.25 em",
      stretch: "0.5 em",
      shrink: "0.25 em"
    }
  },
  preEntrySeparator : {
    glue: {
      width: "0.5 em",
      stretch: "0.25 em",
      shrink: "0.05 em"
    }
  },
  entrySeparator: {
    // text: {
    //   fontWeight: 'bold',
    // }
  },
  postEntrySeparator: {
    glue: {
      width: "1 em",
      stretch: "0.2 em",
      shrink: "0.1 em"
    }
  },
  apparatusLineNumbers: {
    text: {
      fontWeight: 'bold',
    }
  },
  apparatusKeyword: {
    text: {
      fontStyle: 'italic',
    }
  },
  sigla: {
    text: {
      fontStyle: 'italic',
    }
  },
  hand: {
    parent: 'superscript'
  },
  marginalia: {
    parent: "default",
    text: {
      fontSize: "8 pt",
    },
    paragraph: {
      lineSkip: "15 pt"
    },
    glue: {
      width: "0.25 em",
      shrink: "0.03 em",
      stretch: "0.08 em"
    },
  },
  marginaliaKeyword: {
    text: {
      fontStyle: 'italic',
    }
  },
  latinInterSigla: {
    parent: "apparatus",
    glue: { width: "0.15 em", shrink: '0', stretch:'0'}
  }
}