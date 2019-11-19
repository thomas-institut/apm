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

use APM\Core\Item\TextualItem;
use AverroesProjectToApm\ItemInDatabaseItemStream;
use APM\Core\Item\Note;

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
    
    public function __construct(int $docId, array $itemSegments, string $defaultLang = 'la', array $edNotes = []) {
        $this->items = [];
        $itemFactory = new ItemStreamItemFactory($defaultLang);
        
        foreach($itemSegments as $itemRows){
            $previousElementId = -1;
            $previousTbIndex = -1;
            
            foreach ($itemRows as $row) {
                $address = new AddressInDatabaseItemStream();
                $address->setFromItemStreamRow($docId, $row);
                
                if ($row['ce_id'] !== $previousElementId && $address->getTbIndex() === $previousTbIndex) {
                    $this->items[] = new ItemInDatabaseItemStream($address, new TextualItem("\n"));
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
