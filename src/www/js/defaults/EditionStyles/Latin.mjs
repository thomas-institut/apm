/*
 *  Copyright (C) 2022 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */


export const defaultLatinEditionStyle =  {
  _metaData: {
    name: 'Default',
    description: 'A4 paper, FreeSerif'
  },
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
      width: "21 cm",
      height: "29.7 cm",
      marginTop: "2 cm",
      marginLeft: "3 cm",
      marginBottom: "2 cm",
      marginRight: "3 cm",
      minDistanceFromApparatusToText: "1.5 cm",
      minInterApparatusDistance: "0.5 cm",
      lineNumbers: "western",   //  "western", "arabic", "none"
      lineNumbersToTextDistance: "0.5 cm",
      lineNumbersFontSize: "0.8 em",
      lineNumbersPosition: "left",
      resetLineNumbersEachPage: false
    },
    paragraph: {
      lineSkip: "18 pt",
      indent: "0",
      align: 'justified',
      spaceBefore: "0",
      spaceAfter: "0"
    },
    text: {
      fontFamily: "FreeSerif",
      fontSize: "12 pt",
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
      lineSkip: "15 pt"
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
      width: "0.5 em",
      stretch: "0.25 em",
      shrink: "0.1 em"
    }
  },
  preEntrySeparator : {
    glue: {
      width: "0.5 em",
      stretch: "0.25 em",
      shrink: "0.1 em"
    }
  },
  entrySeparator: {
    // text: {
    //   fontWeight: 'bold',
    // }
  },
  postEntrySeparator: {
    glue: {
      width: "0.5 em",
      stretch: "0.25 em",
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
    // nothing in Latin
  },
  hand: {
    parent: 'superscript'
  }
}