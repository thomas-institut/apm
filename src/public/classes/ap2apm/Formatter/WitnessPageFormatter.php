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

namespace AverroesProjectToApm\Formatter;

use APM\Core\Item\TextualItem;
use APM\Core\Item\Mark;
use APM\Core\Item\Item;
use APM\Core\Item\NoWbMark;
use AverroesProjectToApm\ItemStream;
use APM\Core\Item\ItemWithAddress;

use AverroesProjectToApm\UserDirectory;

/**
 * Description of WitnessPageFormatter
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class WitnessPageFormatter implements ItemStreamFormatter {
    
    const DATEFORMAT_DEFAULT = 'Y-m-d H:i:s';
    
    const ICON_NOTE = '<i class="fa fa-comment-o" aria-hidden="true"></i>';
    const ICON_PARAGRAPH = '¶';
    const ICON_GAP = '<i class="fa fa-ellipsis-h" aria-hidden="true"></i>';
    
    const ICON_ORIGINALTEXT = '+';
    const ICON_EQUIV = '&equiv;';
    
    
    const UNKNOWN_ITEM_HTML = '<span class="unknown">???</span>';
    
    const UNKNOWN_USER = 'Unknown User';
    
    const CLASS_TEXTUALITEM = 'textualitem';
    const CLASS_MARKITEM = 'markitem';
    const CLASS_HAND = 'hand_';
    const CLASS_UNCLEAR = 'unclear';
    const CLASS_ILLEGIBLE = 'illegible';
    const CLASS_DELETION = 'deletion';
    const CLASS_ADDITION = 'addition';
    const CLASS_GLOSS = 'gloss';
    const CLASS_OFFLINE = 'offline';
    
    const CLASS_FOLIATION = 'foliation';
    const CLASS_COLUMNBREAK = 'columnbreak';
    
    const CLASS_WITHPOPOVER = 'withformatpopover';
    
    private $markIcons;
    
    private $normalizationNames;
    
    private $noWbClass;
    private $markClass;
    private $textualClass;
    
    private $dateFormat;

    private $userDirectory;
    
    public function __construct(UserDirectory $userDirectory) {
        
        $this->markIcons['note'] = self::ICON_NOTE;
        $this->markIcons['paragraph'] = self::ICON_PARAGRAPH;
        $this->markIcons['gap'] = self::ICON_GAP;
        
        $this->dateFormat = self::DATEFORMAT_DEFAULT;
        
        $this->normalizationNames['sic'] = 'Sic';
        $this->normalizationNames['abbr'] = 'Abbreviation';
        
        $this->markClass = get_class(new Mark());
        $this->noWbClass = get_class(new NoWbMark());
        $this->textualClass = get_class(new TextualItem('stub'));
        
        $this->userDirectory = $userDirectory;
     
    }
    
    
     public function formatItemStream(ItemStream $stream): string {
        $html = '';
        $gotNoWb = false;
        $currentFoliation = '';
        $currentTbIndex = -1;
        foreach($stream->getItems() as $itemWithAddress) {
            $theItem = $itemWithAddress->getItem();
            $theAddress = $itemWithAddress->getAddress();
           
            if ($theAddress->getFoliation() !== $currentFoliation) {
                $currentFoliation = $theAddress->getFoliation();
                $currentTbIndex = $theAddress->getTbIndex();
                $html .= ' <span class="' . self::CLASS_FOLIATION . '">[' . $currentFoliation . "]</span> ";
            } else {
                if ($currentTbIndex !== $theAddress->getTbIndex()) {
                    $currentTbIndex = $theAddress->getTbIndex();    
                    if ($currentTbIndex < 10) {
                        // a column break!
                        $html .=  ' <span class="' . self::CLASS_COLUMNBREAK . '">[' .$currentFoliation . ':c'.  $currentTbIndex . "]</span> ";
                    }
                }
            }
            
            if (is_a($theItem, $this->noWbClass)) {
                $gotNoWb = true;
                continue;
            }
            if (is_a($theItem, $this->textualClass)) {
                $html .= $this->formatTextualItem($theItem, $gotNoWb);
                $gotNoWb = false;
                continue;
            }
            
            $gotNoWb = false;
            if (is_a($theItem, $this->markClass)) {
                if ($theItem->getMarkType() === \APM\Core\Item\ItemFactory::MARK_REF) {
                    $html .= ' ';
                    continue;
                }
                $html .= $this->formatMark($theItem);
                continue;
            }
            
            // This should NEVER happen
            $html .= self::UNKNOWN_ITEM_HTML; // @codeCoverageIgnore
        }
        return $html;
    }

    
    public function getTextualItemFormat(TextualItem $item, bool $gotNoWb) : array {
        $classes = [];
        $classes[] = self::CLASS_TEXTUALITEM;
        $popoverHtml = '';
        
        $classes[] = self::CLASS_HAND . $item->getHand();
        
        if ($item->getHand() !== 0) {
            $popoverHtml = '<b>Hand: </b> '  . ($item->getHand() + 1) . '<br/>'; // @codeCoverageIgnore
        }
        
        if ($item->getFormat() !== TextualItem::FORMAT_NONE) {
            $classes[] = $item->getFormat();
            $popoverHtml .= '<b>Format:</b> ' . $item->getFormat() . '<br/>' ;
        }
        
        if ($item->getClarityValue() < 1) {
            $classes[] = $item->getClarityValue() > 0 ? self::CLASS_UNCLEAR : self::CLASS_ILLEGIBLE;
            $popoverHtml .= '<b>';
            $popoverHtml .= $item->getClarityValue() > 0 ? 'Unclear' : 'Illegible';
            $popoverHtml .= '</b><br/><i class="fa fa-eye-slash" aria-hidden="true"></i></span> ';
            $popoverHtml .= $item->getClarityReason();
            $popoverHtml .= '<br/>';
        }
        
        if ($item->getDeletion() !== TextualItem::DELETION_NONE) {
            $classes[] = self::CLASS_DELETION;
            $popoverHtml .= '<b>Deletion</b><br/>&lowast; ' . $item->getDeletion() . '<br/>';
        }
        
        $this->formatTextualFlow($item, $classes, $popoverHtml);
        $this->formatLocation($item, $classes, $popoverHtml);

        $text = $item->getPlainText();
        if ($gotNoWb) {
            $text = $this->removeLeadingNewLines($text);
        }
        $normalization = $item->getNormalizedText();
        
        if ($item->getNormalizationType() !== TextualItem::NORMALIZATION_NONE) {
            $classes[] = $item->getNormalizationType();
            if ($normalization === '' || $normalization===$text) {
                $normalization = ' (no reading given)';
            }
            $popoverHtml = '<b>' . $this->normalizationNames[$item->getNormalizationType()] . '</b>'. '<br/>' .  
                   '&nbsp;' .  self::ICON_ORIGINALTEXT . ' ' . $text .  '<br/>' . 
                   '&nbsp;' . self::ICON_EQUIV . ' ' . $normalization . '<br/>';
        }
        
        $popoverHtml .= $this->generateNotesHtml($item->getNotes());
        
        if ($popoverHtml !== '') {
            $classes[] = self::CLASS_WITHPOPOVER;
        }
        
        return [ $text, $classes, $popoverHtml];
    }
   
    public function formatTextualItem(TextualItem $item, bool $gotNoWb): string {
        
        list($text, $classes, $popoverHtml) = $this->getTextualItemFormat($item, $gotNoWb);
        
        $html = '<span class="' . 
                implode(' ', $classes) . '"';
        if ($popoverHtml !== '') {
            $html .=  " data-content='" . $popoverHtml . "'";
        }
        $html .= '>' .  $text .  '</span>';
        return $html;
    }
    
    protected function formatMark(Mark $item) : string {
        
        $classes = [];
        $classes[] = self::CLASS_MARKITEM;
        
        $text = $item->getMarkText();
        if ($text === '') {
            $text = $this->markIcons[$item->getMarkType()];
        }
        
        $classes[] = $item->getMarkType();
        $popoverHtml = '';
        
        $this->formatTextualFlow($item, $classes, $popoverHtml);
        $this->formatLocation($item, $classes, $popoverHtml);
        $popoverHtml .= $this->generateNotesHtml($item->getNotes());
        
        if ($popoverHtml !== '') {
            $classes[] = self::CLASS_WITHPOPOVER;
        }
        
        $html = '<span class="' . 
                implode(' ', $classes) . '"';
        if ($popoverHtml !== '') {
            $html .= " data-content='" . $popoverHtml . "'";
        }
        $html .= '>' .  $text .  '</span>';
        return $html;
    }

    protected function removeLeadingNewLines(string $str) : string {
        return mb_ereg_replace("^\n", '', $str);
    }
    
    protected function formatTextualFlow(Item $item, array &$classes, string &$popoverHtml) {
        
        if ($item->getTextualFlow() !== Item::FLOW_MAIN_TEXT) {
            $classes[] = $item->getTextualFlow() === Item::FLOW_ADDITION ? self::CLASS_ADDITION : self::CLASS_GLOSS;
            switch ($item->getTextualFlow()) {
                case Item::FLOW_ADDITION:
                    $popoverHtml .= '<b>Addition</b><br/>';
                    break;
                
                case Item::FLOW_GLOSS:
                    $popoverHtml .= '<b>Gloss</b><br/>';
                    break;
            }
        }
    }
    
    protected function formatLocation(Item $item, array &$classes, string &$popoverHtml) {
        if ($item->getLocation() !== Item::LOCATION_INLINE) {
            $classes[] = self::CLASS_OFFLINE;
            $popoverHtml .= '<i class="fa fa-location-arrow" aria-hidden="true"></i> ' . $item->getLocation();
            $popoverHtml .= '<br/>';
        }
    }
    
    protected function generateNotesHtml(array $edNotes) : string {
        if (count($edNotes) === 0)  {
            return '';
        }
        $html = '<b>Notes</b><br/>';
        
        foreach ($edNotes as $note) {
            $html .= '<p class="notetext">' . $note->getText() . '</p>';
            $html .= '<p class="noteheader"> --' . 
                    $this->userDirectory->getInitialAndLastName($note->getAuthor()) . ' @ ' . 
                    date($this->dateFormat, $note->getTime()) . '</p>';
        }
        return $html;
    }
    

}
