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


use APM\Core\Item\Item;
use APM\Core\Item\ItemFactory;
use APM\Core\Item\Note as ItemNote;
use APM\Core\Item\TextualItem;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TxText\ChapterMark as AP_ChapterMark;
use APM\System\Transcription\TxText\Item as AP_Item;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use ThomasInstitut\TimeString\MalformedStringException;
use ThomasInstitut\TimeString\TimeString;

/**
 * Factory of Items out of AP item stream rows
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemStreamItemFactory {
    

    private ItemFactory $if;
    

    private string $textualItemClass;
    
//    private string $markItemClass;
    
    public function __construct(string $defaultLang) {
        $this->if = new ItemFactory($defaultLang, 0);
        $this->textualItemClass =  TextualItem::class;
//        $this->markItemClass = Mark::class;
    }
    
    public function createItemFromRow(array $row) : Item {
        $itemType = $this->getGoodInt($row, 'type');
        $lang = $row['lang'];
        $text = $this->getGoodString($row, 'text');
        $altText = $this->getGoodString($row, 'alt_text');
        $extraInfo = $this->getGoodString($row, 'extra_info');
        $length =  $this->getGoodInt($row, 'length');
        $target = intval($row['target']);
        $hand = $this->getGoodInt($row, 'hand_id');
        
        $elementType = intval($row['e.type']);
        $elementPlacement = $this->getGoodString($row, 'placement');
        
        $item = null;
        
        switch($itemType) {
            case AP_Item::TEXT: // @codeCoverageIgnore
                $item = $this->if->createPlainTextItem($text, $lang);
                break;
            
            case AP_Item::RUBRIC: // @codeCoverageIgnore
                $item = $this->if->createRubricItem($text, $lang);
                break;

            case AP_Item::BOLD_TEXT:
                $item = $this->if->createBoldTextItem($text, $lang);
                break;

            case AP_Item::ITALIC:
                $item = $this->if->createItalicTextItem($text, $lang);
                break;

            case AP_Item::HEADING:
                $item = $this->if->createHeadingItem($text, $lang);
                break;

            case AP_Item::SIC: // @codeCoverageIgnore
                $item = $this->if->createSicItem($text, $altText, $lang);
                break;
            
            case AP_Item::UNCLEAR: // @codeCoverageIgnore
                $item = $this->if->createUnclearItem($text, $extraInfo, $altText, $lang);
                break;
                
            case AP_Item::ABBREVIATION: // @codeCoverageIgnore
                $item = $this->if->createAbbreviationItem($text, $altText, $lang);
                break;
                
            case AP_Item::ILLEGIBLE: // @codeCoverageIgnore
//                if ($length <= 0) {
//                    return $item;
//                }
                $item = $this->if->createIllegibleItem($length, $extraInfo);
                break;
            
            case AP_Item::GLIPH: // @codeCoverageIgnore
                $item = $this->if->createGliphItem($text, $lang);
                break;
                
            case AP_Item::ADDITION: // @codeCoverageIgnore
                $item = $this->if->createAdditionItem($text, $extraInfo, $lang);
                break;
            
            case AP_Item::DELETION: // @codeCoverageIgnore
                $item = $this->if->createDeletionItem($text, $extraInfo, $lang);
                break;
            
            case AP_Item::MARK: // @codeCoverageIgnore
                $item = $this->if->createNoteMark();
                break;
                
            case AP_Item::NO_WORD_BREAK: // @codeCoverageIgnore
                $item = $this->if->createNoWb();
                break;
                
            case AP_Item::LINEBREAK: // @codeCoverageIgnore
                $item = $this->if->createPlainTextItem("\n", $lang);
                break;
                
            case AP_Item::INITIAL: // @codeCoverageIgnore
                $item = $this->if->createInitialItem($text, $lang);
                break;
                
            case AP_Item::CHUNK_MARK: // @codeCoverageIgnore
                $item = $this->if->createChunkMark($altText, $text, $target, $length);
                break;

            case AP_Item::CHAPTER_MARK: // @codeCoverageIgnore
                $fields = explode(AP_ChapterMark::SEPARATOR, $text);
                $appellation = $fields[0];
                $title = $fields[1];
                $item = $this->if->createChapterMark($altText, $extraInfo, $target, $length,$appellation, $title);
                break;

            case AP_Item::CHARACTER_GAP: // @codeCoverageIgnore
                $item = $this->if->createCharacterGapItem($length);
                break;
            
            case AP_Item::PARAGRAPH_MARK: // @codeCoverageIgnore
                $item = $this->if->createParagraphMark();
                break;
                
            case AP_Item::MATH_TEXT: // @codeCoverageIgnore
                $item = $this->if->createMathTextItem($text, $lang);
                break;
                
            case AP_Item::MARGINAL_MARK: // @codeCoverageIgnore
                $item = $this->if->createReferenceMark($text);
                break;
        }
        
        if ($hand !== 0) {
            if (is_a($item, $this->textualItemClass)) {
                $item->setHand($hand);
            }
        }
        
        switch($elementType) {
            case Element::ADDITION: // @codeCoverageIgnore
            case Element::SUBSTITUTION: // @codeCoverageIgnore
            case Element::GLOSS: // @codeCoverageIgnore
                if ($item->getLocation() === Item::LOCATION_INLINE) {
                    $item->setLocation($elementPlacement);
                }
                if ($item->getTextualFlow()=== Item::FLOW_MAIN_TEXT) {
                    if ($elementType === Element::GLOSS) {
                        $item->setTextualFlow(Item::FLOW_GLOSS);
                    } else {
                        $item->setTextualFlow(Item::FLOW_ADDITION);
                    }
                }
                break;
        }
        return $item;
    }

    /**
     * @throws MalformedStringException
     * @throws InvalidTimeZoneException
     */
    public function createItemNoteFromRow(array $row): ItemNote
    {

        $authorTid = -1;
        $text = '[ No text ]';
        $timeStamp = TimeString::TIME_ZERO;


        if (isset($row['author_tid'])) {
            $authorTid = intval($row['author_tid']);
        }
        
        if (isset($row['time'])) {
            $timeStamp = TimeString::fromString($row['time']);
        }
        
        if (isset($row['text'])) {
            $text = $row['text'];
        }
        
        return new ItemNote($text, $authorTid, $timeStamp);
    }
    
    private function getGoodString(array $someArray, string $someKey) : string {
        if (!isset($someArray[$someKey])) {
            return '';
        }
        
        return (string) $someArray[$someKey];
    }
    
    private function getGoodInt(array $someArray, string $someKey) : int {
        if (!isset($someArray[$someKey])) {
            return -1;
        }
        
        return intVal($someArray[$someKey]);
    }
}
