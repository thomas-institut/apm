export const defaultHebrewEditionStyle = {
  _metaData: {
    name: 'Default',
    description: 'A4 paper, Linux Libertine'
  },
  default: {
    strings : {
      omission: 'חסר',
      addition: 'נוסף',
      ante: 'לפני',
      post: 'אחרי',
      defaultLemmaSeparator: ']',
      lineRangeSeparator: '\u2016',  // double vertical line
      entrySeparator:  '\u007c' // single vertical line
    },
    page: {
      width: "21 cm",
      height: "29.7 cm",
      marginTop: "2 cm",
      marginLeft: "3 cm",
      marginBottom: "2 cm",
      marginRight: "3 cm",
      minDistanceFromApparatusToText: "12 pt",
      minInterApparatusDistance: "12 pt",
      lineNumbers: "western",   //  "western", "arabic", "none"
      lineNumbersToTextDistance: "0.5 cm",
      lineNumbersFontSize: "0.8 em",
      lineNumbersPosition: "left",
      resetLineNumbersEachPage: false
    },
    paragraph: {
      lineSkip: "1.25 em",
      indent: 0,
      align: 'justified',
      spaceBefore: 0,
      spaceAfter: 0
    },
    text: {
      fontFamily: 'Linux Libertine',
      fontSize: "12 pt",
      fontStyle: '',
      fontWeight: '',
      shiftY: "0"
    },
    glue: {
      width: "0.25 em",
      shrink: "0.03 em",
      stretch: "0.08 em"
    },
  },
  emGlue: {
    parent: '', glue: {
      width: '1 em', shrink: '0.02 em', stretch: '0.08 em'
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
    parent: "default",
    text: {
      fontSize: "11 pt",
    },
    paragraph: {
      lineSkip: "14 pt"
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
      width: "0.25 em",
      shrink: "0.02 em",
      stretch: "0.75 em"
    }
  },
  preEntrySeparator : {
    glue: {
      width: "0.25 em",
      shrink: "0.05 em",
      stretch: "0.5 em"
    }
  },
  entrySeparator: {
    // text: {
    //   fontWeight: 'bold',
    // }
  },
  postEntrySeparator: {
    glue: {
      width: "0.25 em",
      shrink: "0.05 em",
      stretch: "0.5 em"
    }
  },
  apparatusLineNumbers: {
    text: {
      fontWeight: 'bold',
    }
  },
  apparatusKeyword: {
    text: {
      fontSize: "0.8 em",
    }
  },
  sigla: {
    text: {
      fontWeight: "bold"
    }
  },
  hand: {
    parent: 'superscript'
  },
  marginalia: {
    parent: "default",
    text: {
      fontSize: "9 pt",
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
}