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

namespace APM\Core\Transcription;

use APM\Core\Address\Point;

/**
 * The address of an item within a page transcription: indexes
 * to textBox and to item within that text box
 * 
 * Notice that the class does not enforce a type for the index but normally
 * the indexes are simply integers referring to positions in arrays.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemAddressInPage extends Point {
    
    const int ITEM_INDEX_COORD = 0;
    const int TEXTBOX_INDEX_COORD = 1;
    
    public function __construct($tbi=null, $ii=null) {
        parent::__construct(2);
        $this->setItemIndex($ii);
        $this->setTbIndex($tbi);
    }
    
    public static function NullAddress(): ItemAddressInPage
    {
        return new ItemAddressInPage(null, null);
    }
    
    public function getTbIndex() {
        return $this->getCoord(self::TEXTBOX_INDEX_COORD);
    }
    
    protected function setTbIndex($index): void
    {
        $this->setCoord(self::TEXTBOX_INDEX_COORD, $index);
    }
    
    public function getItemIndex() {
        return $this->getCoord(self::ITEM_INDEX_COORD);
    }
    
    protected function setItemIndex($index): void
    {
        $this->setCoord(self::ITEM_INDEX_COORD, $index);
    }

    public function getData() : array {
        return [
            'itemIndex' => $this->getItemIndex(),
            'textBoxIndex' => $this->getTbIndex()
        ];
    }

}
