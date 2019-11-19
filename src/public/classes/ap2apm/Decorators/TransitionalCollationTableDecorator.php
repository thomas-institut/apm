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

namespace AverroesProjectToApm\Decorators;

use APM\Core\Collation\CollationTableDecorator;
use APM\Core\Collation\CollationTable;

use APM\Core\Item\ItemFactory;

use AverroesProjectToApm\AddressInDatabaseItemStream;
use APM\Core\Item\TextualItem;
use APM\Core\Item\Mark;
use AverroesProjectToApm\ApUserDirectory;
use AverroesProjectToApm\Formatter\WitnessPageFormatter;

/**
 * Decorator for AverroesProject collation tables
 *
 * It assumes that the CollationTable object contains ONLY witnesses of
 * type ItemStreamWitness
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TransitionalCollationTableDecorator implements CollationTableDecorator {
    
    const CLASS_EMPTYTOKEN = 'tokennotpresent';
    const CLASS_NORMALTOKEN = 'normalToken';
    const CLASS_VARIANT_PREFIX = 'variant_';
    
    const TEXT_EMPTYTOKEN = '&mdash;';
    
    private $ud;
    
    /** @var string */
    protected $textualItemClass;
    /** @var string */
    protected $markItemClass;


    public function __construct(ApUserDirectory $userDirectory) {
        $this->ud = $userDirectory;
        
        $this->textualItemClass = get_class(new TextualItem('stub'));
        $this->markItemClass = get_class(new Mark());
    }
    
    public function decorate(CollationTable $c): array {
        $sigla = $c->getSigla();
        $decoratedCollationTable = [];
        
        $decoratedCollationTable['extra'] = [];
        
        $addressInItemStreamClass  = get_class(new AddressInDatabaseItemStream());
        $textualItemClass = $this->textualItemClass;
        
        
        $formatter = new WitnessPageFormatter($this->ud);
        $variantTable = $c->getVariantTable();
        
        // 1. Put tokens in with basic classes
        foreach($sigla as $siglum) {
            $decoratedCollationTable[$siglum] = [];
            
            $tokenRefs = $c->getReferencesForRow($siglum);
            $witnessTokens = $c->getWitnessTokens($siglum);
            $rawNonTokenItemIndexes = $c->getWitness($siglum)->getNonTokenItemIndexes();
            
            $nonTokenItemIndexes = $this->aggregateNonTokenItemIndexes($rawNonTokenItemIndexes, $tokenRefs, $witnessTokens);
            
            $itemArray = $c->getWitness($siglum)->getItemArray();
            $witnessItemStream = $c->getWitness($siglum)->getDatabaseItemStream();
            foreach($tokenRefs as $i => $tokenRef) {
                $decoratedToken = [];
                if ($tokenRef === CollationTable::TOKENREF_NULL) {
                    $decoratedToken['text'] = self::TEXT_EMPTYTOKEN;
                    $decoratedToken['norm'] = self::TEXT_EMPTYTOKEN;
                    $decoratedToken['classes'] = [self::CLASS_EMPTYTOKEN];
                    $decoratedToken['empty'] = true;
                    $decoratedCollationTable[$siglum][] = $decoratedToken;
                    continue;
                }
                $token = $witnessTokens[$tokenRef];
                $decoratedToken['text'] = $token->getText();
                $decoratedToken['norm'] = $token->getNormalization();
                $decoratedToken['classes'] = [self::CLASS_NORMALTOKEN];
                $decoratedToken['classes'][] = self::CLASS_VARIANT_PREFIX .  $variantTable[$siglum][$i];
                $decoratedToken['empty'] = false;
                $decoratedToken['witnessTokenIndex'] = $tokenRef;
                $decoratedToken['itemIndexes'] = $token->getSourceItemIndexes();
                $decoratedToken['postNotes'] = [];
                if ($nonTokenItemIndexes[$tokenRef]['post'] !== []) {
                    // There are non-token items after the token
                    // check if there are notes
                    foreach($nonTokenItemIndexes[$tokenRef]['post'] as $itemIndex)  {
                        if ($this->isNoteMark($itemArray[$itemIndex]->getItem())){
                            $decoratedToken['postNotes'][] = $formatter->formatMark($itemArray[$itemIndex]->getItem());
                        }
                    }
                }
                $addresses = $token->getSourceItemAddresses();
                $charRanges = $token->getSourceItemCharRanges();
                $decoratedToken['itemFormats'] = [];
                foreach($addresses as $i => $address) {
                    if (is_a($address, $addressInItemStreamClass)) {
                        $sourceItem = $witnessItemStream->getItemById($address->getItemIndex());
                        if ($sourceItem !== false && is_a($sourceItem, $textualItemClass)) {
                            list($itemText, $classes, $popover) = $formatter->getTextualItemFormat($sourceItem, false);
                            // $itemText contains the full item's text, we only need 
                            // the text that belongs to the token
                            $text = $this->getSubstringFromItemAndRange($sourceItem, $charRanges[$i]);
                            $decoratedToken['itemFormats'][] = [ 
                                'text' => $text, 
                                'classes' => $classes, 
                                'popoverHtml' => $popover, 
                                'itemId' => $address->getItemIndex(),
                                'itemSeq' => $address->getItemSeq(),
                                'ceId' => $address->getCeId()
                            ];
                        }
                    }
                }
                if (count($addresses) >= 1) {
                    // report only the first address
                    $address = $addresses[0];
                    
                    $classes =  $decoratedToken['itemFormats'][0]['classes'];
                    $popoverHtml =  $decoratedToken['itemFormats'][0]['popoverHtml'];
                    // Add address to popover
                    array_push($classes, \AverroesProjectToApm\Formatter\WitnessPageFormatter::CLASS_WITHPOPOVER);
                    
                    $decoratedToken['addressHtml'] = '<b>Page:</b> ' . $address->getFoliation() . '<br/><b>Column:</b> ' . $address->getColumn() . '<br/>';
                    $decoratedToken['classes'] = array_merge($decoratedToken['classes'], $classes);
                    $decoratedToken['popoverHtml'] = $popoverHtml;
                }
                
                $decoratedCollationTable[$siglum][] = $decoratedToken;
            }
        }
        
        return $decoratedCollationTable;
    }
    
    
   
    
    protected function getSubstringFromItemAndRange($item, \APM\Core\Address\IntRange $range) : string {
        $sourceString = $item->getPlainText();
        $subStr = mb_substr($sourceString, $range->getStart(), $range->getLength());
        return $subStr;
    }
    
    protected function prettyPrintAddressInItemStream(\APM\Core\Address\Point $address) : string {
        
        return $this->prettyPrintPoint($address);
    }
    
    protected function prettyPrintPoint(\APM\Core\Address\Point $point) {
        $dim = $point->getDimensionCount();
        $data = [];
        for ($i=0; $i< $dim; $i++) {
            $data[] = $point->getCoord($i);
        }
        return implode(':', $data);
    }
    
    protected  function isNoteMark($var) {
        if (!is_object($var)) {
            return false;
        }
        
        if (is_a($var, $this->markItemClass) && ($var->getMarkType() === ItemFactory::MARK_NOTE))  {
            return true;
        }
        return false;
    }

    /**
     * Aggregates nonTokenIndexes taking care of missing token references in the
     * given $tokenRefs array
     *
     * The returned array contains one element per element in $tokenRefs with
     * the same structure as $rawNonTokenItemIndexes
     *
     * @param type $rawNonTokenItemIndexes
     * @param type $tokenRefs
     * @param type $witnessTokens
     * @return array
     */
    protected function aggregateNonTokenItemIndexes($rawNonTokenItemIndexes, $tokenRefs) {
        
        $aggregatedPost = [];
        $resultingArray = [];
        // Note that the array is traversed from the last element to the first
        // this is because the 'post' field of a particular token must have the post fields of
        // the item indexes not present in the tokenRefs array that come AFTER it
        for ($i = count($rawNonTokenItemIndexes)-1; $i >=0; $i--) {
            $tokenItemIndexes = $rawNonTokenItemIndexes[$i];
            $aggregatedPost = array_merge($tokenItemIndexes['post'], $aggregatedPost);
            $tokenIndexInRef = array_search($i, $tokenRefs);
            if ($tokenIndexInRef !== false) {
                $resultingArray[$i]['post'] = $aggregatedPost;
                $aggregatedPost = [];
            }
        }
        
        $aggregatedPre = [];
        for($i=0; $i < count($rawNonTokenItemIndexes); $i++) {
            $tokenItemIndexes = $rawNonTokenItemIndexes[$i];
            $aggregatedPre = array_merge($aggregatedPre, $tokenItemIndexes['pre']);
            $tokenIndexInRef = array_search($i, $tokenRefs);
            if ($tokenIndexInRef !== false) {
                $resultingArray[$i]['pre'] = $aggregatedPre;
                $aggregatedPre = [];
            }
        }
        return $resultingArray;
    }
    
    
}
