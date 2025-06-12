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

/**
 * The address of an item within a document: an ItemAddressInPage plus a pageId
 * 
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
    
    public static function NullAddress(): ItemAddressInPage
    {
        return new ItemAddressInDocument(null, null, null);
    }
    
    public function getPageId() {
        return $this->getCoord(self::PAGEID_COORD);
    }
    public function setPageId($pageId) {
        $this->setCoord(self::PAGEID_COORD, $pageId);
    }

    public function getData(): array
    {
        $data = parent::getData();
        $data['pageId'] = $this->getPageId();
        return $data;
    }
}
