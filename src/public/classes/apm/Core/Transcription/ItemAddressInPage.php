<?php

/*
 * Copyright (C) 2018 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
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
    
    const ITEMINDEX_COORD = 0;
    const TEXTBOXINDEX_COORD = 1;
    
    public function __construct($tbi=null, $ii=null) {
        parent::__construct(2);
        $this->setItemIndex($ii);
        $this->setTbIndex($tbi);
    }
    
    public static function NullAddress() {
        return new ItemAddressInPage(null, null);
    }
    
    public function getTbIndex() {
        return $this->getCoord(self::TEXTBOXINDEX_COORD);
    }
    
    protected function setTbIndex($index) {
        $this->setCoord(self::TEXTBOXINDEX_COORD, $index);
    }
    
    public function getItemIndex() {
        return $this->getCoord(self::ITEMINDEX_COORD);
    }
    
    protected function setItemIndex($index) {
        $this->setCoord(self::ITEMINDEX_COORD, $index);
    }

}
