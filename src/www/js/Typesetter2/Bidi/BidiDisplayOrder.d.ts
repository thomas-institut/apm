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

import { BidiOrderInfo} from './BidiOrderInfo'

/**
 * The intrinsic text direction of a text:
 * - `'ltr'`: Left to Right, as in most european languages
 * - `'rtl'`: Right to Left, as in Arabic and Hebrew
 * - `'en'`: European Number, e.g. 1234
 * - `''` : neutral, e.g., whitespace and punctuation
 */
export type IntrinsicTextDirection = 'ltr' | 'rtl' | 'en' | '';


export class BidiDisplayOrder {
    /**
     * Returns an array of BidiOrderInfo objects with information on each input item's display order taking
     * into account bidirectional text.
     *
     * This is a partial implementation of the Unicode Bidirectional Algorithm. It does not recognize
     * explicit embedding and direction-change characters.
     *
     * The input to the algorithm is an array of textual items that are meant to represent a single paragraph of text
     * in logical order. The type of the items is irrelevant because the algorithm does not use their actual content.
     * The algorithm only cares about each item's intrinsic text direction. So, it needs a function
     * getItemIntrinsicTextDirection(item[i]) that determines that information.
     *
     * The algorithm also needs a default text direction for the paragraph ('ltr' or 'rtl'). If none is given
     * it will be the direction of the first non-neutral, non-numeric item in the array.
     *
     * The algorithm returns the text direction that must be used to display the item assuming
     * that the display mechanism will follow standard rules for display of bidirectional text within the item.
     * However, the algorithm will be accurate only if each input item has only one intrinsic text direction.
     * For example, input items with numbers and punctuation (e.g., '123.') may cause the algorithm to incorrectly
     * place the period.
     */
    static getDisplayOrder (items: any[],
                            defaultTextDirection: string,
                            getItemIntrinsicTextDirection: (s: string) => IntrinsicTextDirection): BidiOrderInfo[];
}





