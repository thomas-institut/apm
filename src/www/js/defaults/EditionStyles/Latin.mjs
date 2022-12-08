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
  strings: {
    omission: 'om.',
    addition: 'add.',
    ante: 'ante',
    post: 'post',
    defaultLemmaSeparator: ']',
    lineRangeSeparator: '\u2016',  // double vertical line
    entrySeparator:  '\u007c' // single vertical line
  },
  formattingStyles: {
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
        width: '4 sp',
        stretch: '2.5 sp',
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
}