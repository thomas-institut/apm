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


import { Typesetter2 } from '../../Typesetter2/Typesetter2.mjs'

export const defaultArabicEditionStyle = {
  strings : {
    omission: 'نقص',
    addition: 'ز',
    ante: 'قبل',
    post: 'بعد',
    defaultLemmaSeparator: ']',
    lineRangeSeparator: '\u2016',  // double vertical line
    entrySeparator:  '\u007c' // single vertical line
  },
  formattingStyles: {
    default: {
      text: {
        fontFamily: 'Noto Naskh Arabic',
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
        width: '1.25 sp',
        shrink: '0.1 sp',
        stretch: '0.35 sp'
      }
    },
    arabicText: {
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
    lineRangeSeparator: {
      text: {
        fontWeight: 'bold',
      }
    },
    postLineRangeSeparator: {
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
    },
    sigla: {
      // no special format in Arabic
    },
    hand: {
      parent: 'superscript'
    }
  }
}