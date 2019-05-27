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

use APM\Core\Transcription\ItemInPage;

/**
 * The transcription of a page 
 * 
 * A page transcription consists of a set of textboxes containing textual items.
 
 * From a textual point of view, the transcription can be seen as a stream of 
 * transcription items (Item class), each one being located somewhere in those 
 * text boxes. The base class provides methods to get all or a some of those
 * items.
 * 
 * Some of these text boxes contain main text and others contain marginalia. 
 * The most common situation is that a page is laid out in columns, each with their
 * own set of marginalia, however, other schemas can occur. The base class
 * does not provide any such schema, but implements a general approach. The
 * specific schema can be implemented with a descendant class and a suitable
 * set of object factories for the different components.
 * 
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class PageTranscription {
        
    
    const NO_TEXTBOX = -1;
    const NO_ITEM = -1;
    
    /**
     * Returns the TextBox object at the given index. 
     * 
     * @return TextBox
     * @throws OutOfBoundsException if there's no TextBox at given index
     */
    abstract public function getTextBoxByIndex(int $index) : TextBox;
    
    /**
     * Returns the reference in the TextBox at the given index.
     * 
     * @return ItemAddressInPage
     */
    abstract public function getTextBoxReference(int $index) : ItemAddressInPage;
    
    /**
     * Returns the number of text boxes defined in the page
     * 
     * @return int
     */
    abstract public function getTextBoxCount() : int;
    
    /**
     * Adds the given text box to the page. Returns the index of the
     * newly added box.
     * 
     * @return int
     */
    abstract public function addTextBox(TextBox $tb) : int;
    
    /**
     * Replaces the Textbox at the given index with the provided
     * Textbox
     * @param int $index
     * @param TextBox $tb
     * @throws OutOfBoundsException if there's no TextBox at given index
     */
    abstract public function replaceTextBox(int $index, TextBox $tb);
    
    /**
     * Returns an array with all the TextBoxes.
     * 
     * This implementation goes out and gets each TextBox individually,
     * descendants might want to override it.
     * 
     * @return TextBox[]
     */
    public function getTextBoxes() : array {
        $textBoxArray = [];
        for ($i = 0; $i < $this->getTextBoxCount(); $i++) {
            $textBoxArray[$i] = $this->getTextBoxByIndex($i);
        }
        return $textBoxArray;
    }
    
    /**
     * Returns an array of ItemInPage objects with the items in the
     * given TextBox taking care of internal references. 
     * 
     * That is, for example,if in the text box there is a mark that signals an 
     * addition of the text
     * in another text box, the items in that text box are included in the 
     * resulting array in the right place. 
     * 
     * @param int $tbIndex
     * @return ItemInPage[]
     */
    public function getItemsForTextBox(int $tbIndex) {
        $tb = $this->getTextBoxByIndex($tbIndex);
        
        $items = $tb->getItems();
        $tbItems = [];
        foreach($items as $ii => $sourceItem) {
            $itemAddress = new ItemAddressInPage($tbIndex, $ii);
            $tbItems[] = new ItemInPage($itemAddress, $sourceItem);
            $textBoxToInclude = $this->getTextBoxWithReference($itemAddress);
            if ( $textBoxToInclude !== self::NO_TEXTBOX) {
                $tbItems = array_merge($tbItems, 
                        $this->getItemsForTextBox($textBoxToInclude));
            }
        }
        return $tbItems;
    }
    
    /**
     * Gets all items in the page transcription in the right order and 
     * taking care of internal references.
     * 
     * @return ItemInPage[]
     */
    public function getAllItems() : array {
        $textBoxes = $this->getTextBoxes();
        $items = [];
        
        foreach ($textBoxes as $tbi => $tb) {
            /* @var $tb TextBox */
            if (!$tb->isMainText()) {
                // Not main text, nothing to do with this text box
                continue;
            }
            if (!$tb->getReference()->isNull()) {
                // text box has a reference, it will be picked
                // up at its proper place eventually
                continue;
            }
            $tbItems = $this->getItemsForTextBox($tbi);
            $items = array_merge($items, $tbItems);
        }
        return $items;
    }
    
    /**
     * Returns the items between two addresses in the page.
     * 
     * if any of the addresses is invalid, returns an empty array
     * 
     * 
     * @param ItemAddressInPage $from  if null, from the start of the page
     * @param ItemAddressInPage $to    if null, up until the last item
     */
    public function getItemRange(ItemAddressInPage $from, ItemAddressInPage $to) : array {
        //
        // No frills implementation: just filters from getAllItems()
        //
        $items = $this->getAllItems();
        if ($from->isNull() && $to->isNull()) {
            return $items;
        }
        
        if ($from->isNull()) {
            $fromIndex = 0;
        } else {
            $fromIndex = $this->getItemIndexForAddress($items, $from);
            if ($fromIndex === self::NO_ITEM) {
                return [];
            }
        }
        if ($to->isNull()) {
            $toIndex = count($items)-1;
        } else {
            $toIndex = $this->getItemIndexForAddress($items, $to);
            if ($toIndex === self::NO_ITEM) {
                return [];
            }
        }
        if ($toIndex < $fromIndex) {
            return [];
        }
        
        return array_slice($items, $fromIndex, $toIndex+1-$fromIndex);
        
    }
    
    protected function getItemIndexForAddress(array $items, ItemAddressInPage $address) {
        foreach($items as $index => $item) {
            if ($item->getAddress()->isEqualTo($address)) {
                return $index;
            }
        }
        return self::NO_ITEM;
    }

    protected function getTextBoxWithReference(ItemAddressInPage $address) {
        
        $textBoxCount = $this->getTextBoxCount();
        for ($i = 0; $i < $textBoxCount; $i++) {
            if ($this->getTextBoxReference($i)->isEqualTo($address)) {
                return $i;
            }
        }
        return self::NO_TEXTBOX;
    }
    
}
