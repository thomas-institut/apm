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

namespace APM\System\Transcription;

use APM\Core\Address\Point;
use APM\Core\Transcription\ItemAddressInDocument;
use APM\System\Transcription\ColumnElement\Element;

/**
 * Class to capture the location fields of an ItemStream
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
class AddressInDatabaseItemStream extends ItemAddressInDocument {
    
    const int COORD_ITEMID = 0;
    const int COORD_ITEMSEQ = 1;
    const int COORD_ELEMENTID = 2;
    const int COORD_ELEMENTSEQ = 3;
    const int COORD_COL = 4;
    const int COORD_PAGE_ID = 5;
    const int COORD_PAGESEQ = 6;
    const int COORD_PAGEFOL = 7;
    const int COORD_DOCID = 8;
    const int COORD_TBINDEX = 9;
    
    /**
     *
     * @var Point
     */
    private Point $fullAddress;
    
    public function __construct() {
        $this->fullAddress = new Point(10);
        parent::__construct();
    }
    
    public function setFromItemStreamRow(int $docId, array $itemStreamRow): void
    {
        $this->fullAddress->setCoord(self::COORD_DOCID, $docId);
        $this->fullAddress->setCoord(self::COORD_ITEMID, intval($itemStreamRow['id']));
        $this->fullAddress->setCoord(self::COORD_ITEMSEQ, intval($itemStreamRow['seq']));
        $this->fullAddress->setCoord(self::COORD_ELEMENTID, intval($itemStreamRow['ce_id']));
        $this->fullAddress->setCoord(self::COORD_ELEMENTSEQ, intval($itemStreamRow['e.seq']));
        $this->fullAddress->setCoord(self::COORD_COL, intval($itemStreamRow['col']));
        $this->fullAddress->setCoord(self::COORD_PAGE_ID, intval($itemStreamRow['page_id']));
        $this->fullAddress->setCoord(self::COORD_PAGESEQ, intval($itemStreamRow['p.seq']));
        if (!isset($itemStreamRow['foliation'])  || $itemStreamRow['foliation'] === '') {
            $this->fullAddress->setCoord(self::COORD_PAGEFOL, strval($itemStreamRow['p.seq']));
        } else {
            $this->fullAddress->setCoord(self::COORD_PAGEFOL, $itemStreamRow['foliation']);
        }
        // Get tb index: if element is line, set it as col, if not, the element id
        $elementType = Element::LINE;
        if (isset($itemStreamRow['e.type'])) {
            $elementType = intval($itemStreamRow['e.type']);
        }
        
        if ($elementType === Element::LINE) {
            $this->fullAddress->setCoord(self::COORD_TBINDEX, $this->fullAddress->getCoord(self::COORD_COL));
        } else {
            $this->fullAddress->setCoord(self::COORD_TBINDEX, $this->fullAddress->getCoord(self::COORD_ELEMENTID));
        }
        
    }

    public function getCeSeq() {
        return $this->fullAddress->getCoord(self::COORD_ELEMENTSEQ);
    }
    
//    public function getFullAddress() {
//        return $this->fullAddress;
//    }
    
    public function getItemId()  {
        return $this->fullAddress->getCoord(self::COORD_ITEMID);
    }
    
    public function getFoliation() {
        return $this->fullAddress->getCoord(self::COORD_PAGEFOL);
    }
    
    public function getPageId() {
        return $this->fullAddress->getCoord(self::COORD_PAGE_ID);
    }
    
    public function setPageId($pageId): void
    {
        $this->fullAddress->setCoord(self::COORD_PAGE_ID, $pageId);
    }
    
    public function getTbIndex() {
        return $this->fullAddress->getCoord(self::COORD_TBINDEX);
    }
    
    public function setTbIndex($index): void
    {
        $this->fullAddress->setCoord(self::COORD_TBINDEX, $index);
    }
    
    public function getItemIndex() {
        return $this->fullAddress->getCoord(self::COORD_ITEMID);
    }
    
    public function setItemIndex($index): void
    {
        $this->fullAddress->setCoord(self::COORD_ITEMID, $index);
    }
    
    public function getColumn() {
        return $this->fullAddress->getCoord(self::COORD_COL);
    }
    
    public function getCeId() {
        return $this->fullAddress->getCoord(self::COORD_ELEMENTID);
    }
    
    public function getItemSeq() {
        return $this->fullAddress->getCoord(self::COORD_ITEMSEQ);
    }

    public function getData(): array
    {
        $data = parent::getData();

        $data['ceId'] = $this->getCeId();
        $data['column'] = $this->getColumn();
        $data['foliation'] = $this->getFoliation();
        $data['itemSeq'] = $this->getItemSeq();
        $data['itemId'] = $this->getItemId();
        $data['ceSeq'] = $this->getCeSeq();
        return $data;
    }

}
