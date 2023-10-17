/*
 *  Copyright (C) 2023 Universität zu Köln
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

/**
 * Class to hold information about a textual item's ordering
 * in a paragraph taking into account potential changes of text
 * direction. It's meant to be associated with an array of items that
 * represent a paragraph of text in logical text order.
 */
export class BidiOrderInfo {
  constructor () {
    /**
     * The index of the item in the original item array
     * @type {number}
     */
    this.inputIndex = -1
    /**
     * The display position of the item.
     * Position 0 is the first position in the paragrpah
     * @type {number}
     */
    this.displayOrder = -1

    /**
     *  The item's intrinsic text direction. One of:
     *   'en' : European numbers  (also for numerical strings such as '1.9' or '1,923,234.25')
     *   'rtl' :  right to left text
     *   'ltr' :  left to right text
     *   '' : neutral text (e.g., whitespace and punctuation)
     * @type {string}
     */
    this.intrinsicTextDirection = ''

    /**
     * The item's actual text direction that should be used for display: 'ltr' or 'rtl'
     * @type {string}
     */
    this.textDirection = ''

    /**
     * The item's embedding level according to the standard bidi algorithm:
     *
     *  - level 0 is always un-embedded LTR text.
     *  - level 1 is RTL text embedded into LTR text or un-embedded RTL text in a paragraph without LTR text
     *  - level 2 is LTR text embedded into level 1 RTL text
     *  - level 3 is RTL text embedded into level 2 LTR text
     *
     * and so on for deeper levels.  Even levels are always LTR text and odd levels are always RTL.
     *
     * Text usually only has at most levels 0 and 1. Deeper levels are only necessary when explicit embedding characters
     * are used.
     *
     * @type {number}
     */
    this.embeddingLevel = -1
  }
}
