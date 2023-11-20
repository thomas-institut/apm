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

export const arabicDeGruyterAmiri = {
  _metaData: {
    name: 'De Gruyter Amiri',
    description: 'De Gruyter format'
  },
  fontConversions : [
    // {
    //   from: { fontFamily: 'Amiri', fontWeight: 'bold'},
    //   to: { fontFamily: 'AmiriBold', fontWeight: ''}
    // },
    // { from: { script: 'la'}, to: { fontFamily: 'FreeSerif'}}
  ],
  default: {
      strings : {
        omission: "نقص",
        addition: "ز",
        ante: "قبل",
        post: "بعد",
        defaultLemmaSeparator: "]",
        lineRangeSeparator: "\u2016",  // double vertical line
        entrySeparator:  "\u007c" // single vertical line
        // entrySeparator: "\u2016",  // double vertical line
      },

      page: {
        width: "17 cm",
        height: "24 cm",
        marginTop: "2.5 cm",
        marginLeft: "2.5 cm",
        marginBottom: "2.5 cm",
        marginRight: "2 cm",
        minDistanceFromApparatusToText: "12 pt",
        minInterApparatusDistance: "12 pt",
        lineNumbers: "arabic",   //  "western", "arabic", "none"
        lineNumbersToTextDistance: "0.7 cm",
        lineNumbersFontSize: "0.9 em",
        lineNumbersPosition: "right",
        resetLineNumbersEachPage: true
      },
      paragraph: {
        lineSkip: "18 pt",
        indent: "0",
        align: 'justified',
        spaceBefore: "0",
        spaceAfter: "0"
      },
      text: {
        fontFamily: "Amiri",
        fontSize: "12 pt",
        fontStyle: "",
        fontWeight: "",
        shiftY: "0"
      },
      glue: {
        width: "0.35 em",
        shrink: "0.02 em",
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
  arabicText: {
      parent: "",
    },
  latinText: {
      parent: "",
      text: {
        fontFamily: "FreeSerif"
      }
    },
  normal: {
      parent: "default",
      paragraph: {
        indent: "1 em"
      }
    },
  h1: {
      parent: "default",
      text: {
        fontSize: "1.33333333 em",
      },
      paragraph: {
        align: "center",
        spaceBefore: "2 em",
        spaceAfter: "1 em"
      }
    },
    h2: {
      parent: "default",
      text: {
        fontSize: "1.1666666 em",
      },
      paragraph: {
        spaceBefore: "1 em",
        spaceAfter: "0.5 em"
      }
    },
    h3: {
      parent: "default",
      text: {
        fontWeight: "bold",
      },
      paragraph: {
        spaceBefore: "0.5 em",
        spaceAfter: "0.25 em"
      }
    },
    apparatus: {
      parent: "default",
      text: {
        fontSize: "9 pt",
      },
      paragraph: {
        lineSkip: "15 pt"
      },
      glue: {
        width: "0.35 em",
        shrink: "0.02 em",
        stretch: "0.08 em"
      },
    },
    lineRangeSeparator: {
      text: {
        fontFamily: 'Amiri'
      }
    },
  postLineRangeSeparator: {
    glue: {
      width: "0.25 em",
      shrink: "0.03 em",
      stretch: "0.18 em"
    }
  },
  preEntrySeparator : {
    glue: {
      width: "0.25 em",
      shrink: "0.03 em",
      stretch: "0.15 em"
    }
  },
  entrySeparator: {
    text: {
      fontFamily: 'FreeSerif'
    }
  },
  postEntrySeparator: {
    glue: {
      width: "0.25 em",
      shrink: "0.03 em",
      stretch: "0.15 em"
    }
  },
    apparatusLineNumbers: {
      text: {
        fontWeight: "bold",
      }
    },
    apparatusKeyword: {
      text: {
        fontSize: "0.8 em",
      }
    },
    sigla: {
      // no special format in Arabic
    },
    hand: {
      parent: "superscript"
    },
  marginalia: {
    parent: "default",
    text: {
      fontSize: "10 pt",
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