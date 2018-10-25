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

/**
 * The address of an item within a page transcription: indexes
 * to textBox and to item within that text box
 * 
 * Notice that the class does not enforce a type for the index but normally
 * the indexes are simply integers referring to positions in arrays.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemAddressInDocument extends ItemAddressInPage {
    const PAGEID_COORD = 2;
    
    public $pageId;
        
    public function __construct($pi = null, $tbi=null, $ii=null) {
        parent::__construct($tbi, $ii);
        $this->coords[self::PAGEID_COORD] = null;
        $this->setPageId($pi);
    }
    
    public static function NullAddress() {
        return new ItemAddressInDocument(null, null, null);
    }
    
    public function getPageId() {
        return $this->getCoord(self::PAGEID_COORD);
    }
    public function setPageId($pageId) {
        $this->setCoord(self::PAGEID_COORD, $pageId);
    }
}
