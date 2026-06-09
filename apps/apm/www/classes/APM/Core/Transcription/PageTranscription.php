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

use OutOfBoundsException;

/**
 * The transcription of a page
 *
 * A page transcription consists of a set of text boxes containing textual items. Some of
 * these text boxes contain the main text and some contain marginalia that may or may not
 * be considered as belonging also to that main text. A text box, for instance, can be an
 * addition to the main text or simply a gloss.
 *
 * This model is a simplification of a more general model in which a page is construed as
 * a set of glyphs located in a surface, with the page transcription amounting to a
 * transcription of each of those glyphs together with some sort of ordering of the glyphs
 * to construct readable text.  Since most of the glyphs in a manuscript stand for one or
 * more letters arranged in lines of text in page regions, we can simply use text boxes to
 * capture the physical location of the text and textual items for the formatted text
 * inside them. This has the advantage of allowing an easier retrieval and arranging of
 * the text.
 *
 * The most common situation is that a page is laid out in columns of main text, each
 * with their own set of marginalia. However, other schemas can occur. The base class does
 * not provide any such schema, but implements a general approach. The specific schema can
 * be implemented with a descendant class and a suitable set of object factories for the
 * different components. This class, however, models the page as a set of indexed text
 * boxes, some of which may refer or point to other text boxes in the page. A marginal
 * addition is, for example, a text box that points to a specific textual item in another
 * text box where the marginal text is to be included.
 *
 * One of the essential uses of a page transcription is indeed getting the main text, the
 * transcription can be construed as a stream of textual items each of them with an
 * associated location in the page's text boxes. It should be possible to extract an array
 * of such located textual items (ItemInPage class, which is simply Item with
 * ItemAddressInPage) taking care of inserting text from marginal text boxes as necessary.
 *

 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class PageTranscription {
        
    
    const int NO_TEXTBOX = -1;
    const int NO_ITEM = -1;

    /**
     * Returns the TextBox object at the given index.
     *
     * @param int $index
     * @return TextBox
     */
    abstract public function getTextBoxByIndex(int $index) : TextBox;

    /**
     * Returns the ItemAddressinPage to which the TextBox at $index refers.
     *
     * @param int $index
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
     * @param TextBox $tb
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
     * That is, for example, if in the text box there is a mark that signals an 
     * addition of the text in another text box, the items in that text box are 
     * included in the resulting array in their appropriate place
     * 
     * @param int $textBoxIndex
     * @return ItemInPage[]
     */
    public function getItemsForTextBox(int $textBoxIndex): array
    {
        $textBox = $this->getTextBoxByIndex($textBoxIndex);
        
        $items = $textBox->getItems();
        $textBoxItemsWithAddress = [];
        foreach($items as $itemIndex => $sourceItem) {
            $itemAddress = new ItemAddressInPage($textBoxIndex, $itemIndex);
            $textBoxItemsWithAddress[] = new ItemInPage($itemAddress, $sourceItem);
            $textBoxToInclude = $this->getTextBoxWithReference($itemAddress);
            if ($textBoxToInclude !== self::NO_TEXTBOX) {
                $textBoxItemsWithAddress = array_merge($textBoxItemsWithAddress,
                        $this->getItemsForTextBox($textBoxToInclude));
            }
        }
        return $textBoxItemsWithAddress;
    }
    
    /**
     * Gets all items in the page transcription in the right order and 
     * taking care of internal references.
     * 
     * @return ItemInPage[]
     */
    public function getAllMainTextItemsInPage() : array {
        $textBoxes = $this->getTextBoxes();
        $items = [];
        
        foreach ($textBoxes as $textBoxIndex => $textBox) {
            /* @var $textBox TextBox */
            if (!$textBox->isMainText()) {
                // Not main text, nothing to do with this text box
                continue;
            }
            if (!$textBox->getReference()->isNull()) {
                // text box has a reference, it will be picked
                // up at its proper place eventually
                continue;
            }
            $tbItems = $this->getItemsForTextBox($textBoxIndex);
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
     * @param ItemAddressInPage $from if null, from the start of the page
     * @param ItemAddressInPage $to if null, up until the last item
     * @return array
     */
    public function getItemRange(ItemAddressInPage $from, ItemAddressInPage $to) : array {
        //
        // No frills implementation: just filters from getAllItems()
        //
        $items = $this->getAllMainTextItemsInPage();
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
