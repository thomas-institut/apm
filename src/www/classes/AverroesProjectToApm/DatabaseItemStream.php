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
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item as ApItem;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\CodeDebug\PrintCodeDebugTrait;


/**
 *
 * In essence  an array of rows coming straight
 * from the database in. The main purpose of this class is to couple this
 * raw data to the Witness abstractions in the new APM design.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DatabaseItemStream implements  CodeDebugInterface{

    use PrintCodeDebugTrait;
    /**
     *
     * @var array 
     */
    private array $items;
    /**
     * @var int|string
     */
    private $lang;

    /**
     * DatabaseItemStream constructor
     *
     * Creates a DatabaseItemStream out of an array of database item segments.
     * Chunks in APM transcriptions are made out of numbered segments. For each one of those segments
     * $itemSegments has an array of item rows prepared by DataManager. Each row
     * contains the item information plus page and ApElement info as well
     *
     * @param int $docId
     * @param array $itemSegments
     * @param string $defaultLang
     * @param array $edNotes
     * @param bool $debugMode
     */
    public function __construct(int $docId, array $itemSegments, string $defaultLang = 'la', array $edNotes = [], bool $debugMode = false) {
        $this->items = [];
        $itemFactory = new ItemStreamItemFactory($defaultLang);
        $langs = [];

        $this->debugMode = $debugMode;
        $this->codeDebug("Constructing DatabaseItemStream");

        foreach($itemSegments as $itemRows){
            $previousElementId = -1;
            $previousTbIndex = -1;
            $previousElementType = -1;
            // the first fakeItemId to be used, it should be only relevant locally within the itemstream
            // but in order to avoid unintended problems it's better to use a number that is unlikely
            // to be used as an item id for real in a long time. For reference, after about 3 years of use,
            // as of Feb 2020, the highest itemId in the production database is around 660 000
            $fakeItemIdStart  = 999000000000;
            
            foreach ($itemRows as $i => $row) {
                $this->codeDebug("** ItemRow $i: pei $previousElementId, ptbi $previousTbIndex, pet $previousElementType, text='" . $row['text'] . "'") ;
                $address = new AddressInDatabaseItemStream();
                $address->setFromItemStreamRow($docId, $row);
                $ceId = intval($row['ce_id']);
                
                if ($ceId !== $previousElementId && $address->getTbIndex() === $previousTbIndex) {
                    // a change of element within the same text box: most of the times
                    // this is a change from a line to another line
                    // need to insert a "ghost" item into the item stream to account for line and text box breaks
                    // the address should be fake
                    $fakeAddress = new AddressInDatabaseItemStream();
                    $fakeAddress->setFromItemStreamRow($docId, $row);
                    $fakeAddress->setItemIndex($fakeItemIdStart++);
                    if ($previousElementType === intval($row['e.type']) && (
                            $previousElementType === Element::LINE ||
                            $previousElementType === Element::GLOSS ||
                            $previousElementType === Element::ADDITION)) {
                        // two elements of the same type in a row = a line break within the same text box
                        $this->codeDebug("Inserting ghost item: new line");
                        $this->items[] = new ItemInDatabaseItemStream($fakeAddress, new TextualItem("\n"));
                    } else {
                        // different element types in a row =  e.g. an addition after a line
                        $this->codeDebug("Inserting ghost item: TextBoxBreak (different elements in a row, same TB)");
                        $this->items[] = new ItemInDatabaseItemStream($fakeAddress, new Mark(MarkType::TEXT_BOX_BREAK));
                    }
                }

                if ($address->getTbIndex() !== $previousTbIndex && $previousTbIndex !== -1) {
                    // change of text box from a marginal
                    $fakeAddress = new AddressInDatabaseItemStream();
                    $fakeAddress->setFromItemStreamRow($docId, $row);
                    $fakeAddress->setItemIndex($fakeItemIdStart++);
                    $this->codeDebug("Inserting ghost item: TextBoxBreak (change to or from a marginal)");
                    $this->items[] = new ItemInDatabaseItemStream($fakeAddress, new Mark(MarkType::TEXT_BOX_BREAK));
                }

                if ( intval($row['type']) === ApItem::ADDITION && isset($row['target']) && !is_null($row['target']) && intval($row['target']) !== 0) {
                    // this is an item that replaces a previous item
                    // add a "ghost" mark item to signal this
                    $fakeAddress = new AddressInDatabaseItemStream();
                    $fakeAddress->setFromItemStreamRow($docId, $row);
                    $fakeAddress->setItemIndex($fakeItemIdStart++);
                    $this->codeDebug("Inserting ghost item: itemBreak");
                    $this->items[] = new ItemInDatabaseItemStream($fakeAddress, new Mark(MarkType::ITEM_BREAK));

                }

                $lang = $row['lang'];
                if (!isset($langs[$lang])) {
                    $langs[$lang] = 0;
                }
                $langs[$lang]++;

                $item = $itemFactory->createItemFromRow($row);

                $itemId = $address->getItemId();
                $noteIndexes = $this->findNoteIndexesById($edNotes, $itemId );
                foreach ($noteIndexes as $noteIndex) {
                    $note = $itemFactory->createItemNoteFromRow($edNotes[$noteIndex]);
                    $item->addNote($note);
                }
                $this->codeDebug("Inserting item");
                $this->items[] = new ItemInDatabaseItemStream($address, $item);
                $previousElementId = intval($row['ce_id']);
                $previousElementType = intval($row['e.type']);
                $previousTbIndex = $address->getTbIndex();
            }
        }
        $maxLang = 0;
        $streamLang = '';
        foreach($langs as $code => $itemCount) {
            if ($itemCount > $maxLang) {
                $streamLang = $code;
                $maxLang = $itemCount;
            }
        }
        $this->lang = $streamLang;
    }

    public function getLang(): string {
        return $this->lang;
    }
    
    public function getItems() : array {
        return $this->items;
    }
    
    public function addItem(ItemInDatabaseItemStream $item): void
    {
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
