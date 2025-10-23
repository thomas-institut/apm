<?php
/* 
 *  Copyright (C) 2019 Universität zu Köln
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

namespace APM\Core\Item;


/**
 *  Mark type constants
 *
 * @package APM\Core\Item
 */
class MarkType
{
    const string NO_WB = '__nowb';
    const string CHUNK = '__chunkmark';
    const string CHAPTER = '__chapter';
    const string TEXT_BOX_BREAK = '__textBoxBreak';
    const string ITEM_BREAK = '__itemBreak';

    const string REF = 'ref';
    const string PARAGRAPH = 'paragraph';
    const string NOTE = 'note';
    const string GAP = 'gap';

}