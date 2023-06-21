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

export const arabicDeGruyter = {
  _metaData: {
    name: 'De Gruyter',
    description: 'De Gruyter format'
  },
  fontConversions : [
    {
      from: { fontFamily: 'AdobeArabic', fontWeight: 'bold'},
      to: { fontFamily: 'AdobeArabicBold', fontWeight: ''}
    },
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
      },

      page: {
        width: "17 cm",
        height: "24 cm",
        marginTop: "2.5 cm",
        marginLeft: "2.5 cm",
        marginBottom: "2.5 cm",
        marginRight: "2.5 cm",
        minDistanceFromApparatusToText: "1.5 cm",
        minInterApparatusDistance: "0.5 cm",
        lineNumbers: "arabic",   //  "western", "arabic", "none"
        lineNumbersToTextDistance: "0.8 cm",
        lineNumbersFontSize: "1 em",
        lineNumbersPosition: "right"
      },
      paragraph: {
        lineSkip: "18 pt",
        indent: "0",
        align: 'justified',
        spaceBefore: "0",
        spaceAfter: "0"
      },
      text: {
        fontFamily: "AdobeArabic",
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
        fontSize: "1.25 em",
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
        fontSize: "1.1 em",
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
        fontSize: "0.9 em",
      },
      paragraph: {
        lineSkip: "16 pt"
      }
    },
    lineRangeSeparator: {
      text: {
        fontWeight: "bold",
      }
    },
  postLineRangeSeparator: {
    glue: {
      width: "0.75 em",
      stretch: "0.5 em",
      shrink: "0.2 em"
    }
  },
  preEntrySeparator : {
    glue: {
      width: "0.4 em",
      stretch: "0.25 em",
      shrink: "0.05 em"
    }
  },
  entrySeparator: {
    // text: {
    //   fontWeight: "bold",
    // }
  },
  postEntrySeparator: {
    glue: {
      width: "0.5 em",
      stretch: "0.3 em",
      shrink: "0.05 em"
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
    }
}