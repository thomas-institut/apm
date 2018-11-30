<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
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

namespace AverroesProjectToApm;

use APM\Core\Address\Point;
/**
 * Class to capture the location fields of an AverroesProject ItemStream
 *   - item id
 *   - item sequence within element
 *   - element id
 *   - element sequence within column
 *   - column number
 *   - page id
 *   - page sequence number (i.e. page number within document)
 *   - page foliation
 *   - document Id
 *
 *  All these locations fields are integers except page foliation, which is
 *  a string
 *  
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class AddressInItemStream extends Point {
    
    const COORD_ITEMID = 0;
    const COORD_ITEMSEQ = 1;
    const COORD_ELEMENTID = 2;
    const COORD_ELEMENTSEQ = 3;
    const COORD_COL = 4;
    const COORD_PAGE_ID = 5;
    const COORD_PAGESEQ = 6;
    const COORD_PAGEFOL = 7;
    const COORD_DOCID = 8;
    
    public function __construct() {
        parent::__construct(9);
    }
    
    public function setFromItemStreamRow(int $docId, array $itemStreamRow) {
        $this->setCoord(self::COORD_DOCID, $docId);
        $this->setCoord(self::COORD_ITEMID, $itemStreamRow['id']);
        $this->setCoord(self::COORD_ITEMSEQ, $itemStreamRow['seq']);
        $this->setCoord(self::COORD_ELEMENTID, $itemStreamRow['ce_id']);
        $this->setCoord(self::COORD_ELEMENTSEQ, $itemStreamRow['e.seq']);
        $this->setCoord(self::COORD_COL, $itemStreamRow['col']);
        $this->setCoord(self::COORD_PAGE_ID, $itemStreamRow['page_id']);
        $this->setCoord(self::COORD_PAGESEQ, $itemStreamRow['p.seq']);
        $this->setCoord(self::COORD_PAGEFOL, $itemStreamRow['foliation']);
        if (!$itemStreamRow['foliation']) {
            $this->setCoord(self::COORD_PAGEFOL, strval($itemStreamRow['p.seq']));
        }
    }
    
    public function getItemId()  {
        return $this->getCoord(self::COORD_ITEMID);
    }
    
    public function getFoliation() {
        return $this->getCoord(self::COORD_PAGEFOL);
    }

}
