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

namespace AverroesProjectToApm;

use APM\Core\Item\Mark;
use APM\Core\Item\MarkType;
use APM\Core\Item\TextualItem;
use ThomasInstitut\TimeString\TimeString;

/**
 *
 * In essence  an array of rows coming straight
 * from the database in. The main purpose of this class is to couple this
 * raw data to the Witness abstractions in the new APM design.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DatabaseItemStream {
    
    /**
     *
     * @var array 
     */
    private $items;

    /**
     * DatabaseItemStream constructor
     *
     * Creates a DatabaseItemStream out of an array of database item segments.
     * Chunks in APM transcriptions are made out of numbered segments. For each one of those segments
     * $itemSegments has an array of item rows prepared by DataManager. Each row
     * contains the item information plus page and ApElement info as well
     *
     *
     *
     * @param int $docId
     * @param array $itemSegments
     * @param string $defaultLang
     * @param array $edNotes
     */
    public function __construct(int $docId, array $itemSegments, string $defaultLang = 'la', array $edNotes = []) {
        $this->items = [];
        $itemFactory = new ItemStreamItemFactory($defaultLang);
        
        foreach($itemSegments as $itemRows){
            $previousElementId = -1;
            $previousTbIndex = -1;
            $previousElementType = -1;
            // the first fakeItemId to be used, it should be only relevant locally within the itemstream
            // but in order to avoid unintended problems it's better to use a number that is unlikely
            // to be used as an item id for real in a long time. For reference, after about 3 years of use,
            // as of Feb 2020, the highest itemId in the production database is around 660 000
            $fakeItemIdStart  = 999000000000;
            
            foreach ($itemRows as $row) {
                $address = new AddressInDatabaseItemStream();
                $address->setFromItemStreamRow($docId, $row);
                
                if ($row['ce_id'] !== $previousElementId && $address->getTbIndex() === $previousTbIndex) {
                    // need to insert a "ghost" item into the item stream to account for line and text box breaks
                    // the address should be fake
                    $fakeAddress = new AddressInDatabaseItemStream();
                    $fakeAddress->setFromItemStreamRow($docId, $row);
                    $fakeAddress->setItemIndex($fakeItemIdStart++);
                    if ($previousElementType === $row['e.type']) {
                        // two elements of the same type in a row = a line break within the same text box
                        $this->items[] = new ItemInDatabaseItemStream($fakeAddress, new TextualItem("\n"));
                    } else {
                        // change of text box, e.g. an addition
                        $this->items[] = new ItemInDatabaseItemStream($fakeAddress, new Mark(MarkType::TEXT_BOX_BREAK));
                    }
                }
                $item = $itemFactory->createItemFromRow($row);
                $itemId = $address->getItemId();
                $noteIndexes = $this->findNoteIndexesById($edNotes, $itemId );
                foreach ($noteIndexes as $noteIndex) {
                    $note = $itemFactory->createItemNoteFromRow($edNotes[$noteIndex]);
                    $item->addNote($note);
                }
                $this->items[] = new ItemInDatabaseItemStream($address, $item);
                $previousElementId = $row['ce_id'];
                $previousElementType = $row['e.type'];
                $previousTbIndex = $address->getTbIndex();
            }
        }
    }
    
    public function getItems() : array {
        return $this->items;
    }
    
    public function addItem(ItemInDatabaseItemStream $item) {
        $this->items[] = $item;
    }
    
    /**
     * Searches the item stream for an item with the given item Id
     * 
     * @param int $itemId
     * @return boolean
     */
    public function getItemById(int $itemId) {
        foreach($this->items as $item) {
            if ($item->getAddress()->getItemIndex() === $itemId) {
                return $item->getItem();
            }
        }
        return false;
    }
    
    private function findNoteIndexesById(array $noteArrayFromDb, int $id) {
        $indexes = [];
        foreach ($noteArrayFromDb as $index => $note) {
            $noteTarget = isset($note['target']) ? (int) $note['target'] : -1;
            if ($id === $noteTarget) {
                $indexes[] = $index;
            }
        }
        return $indexes;
    }
}
