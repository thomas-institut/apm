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

namespace AverroesProjectToApm\Decorators;

use APM\Core\Collation\CollationTableDecorator;
use APM\Core\Collation\CollationTable;

use AverroesProjectToApm\AddressInItemStream;
use APM\Core\Item\TextualItem;

/**
 * Description of QuickCollationTableDecorator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TransitionalCollationTableDecorator implements CollationTableDecorator {
    
    const CLASS_EMPTYTOKEN = 'tokennotpresent';
    const CLASS_NORMALTOKEN = 'normalToken';
    const CLASS_VARIANT_PREFIX = 'variant_';
    
    const TEXT_EMPTYTOKEN = '&mdash;';
    
    public function decorate(CollationTable $c): array {
        $sigla = $c->getSigla();
        $decoratedCollationTable = [];
        
        $addressInItemStreamClass  = get_class(new AddressInItemStream());
        $textualItemClass = get_class(new TextualItem('stub'));
        
        $formatter = new \AverroesProjectToApm\Formatter\WitnessPageFormatter();
        $variantTable = $c->getVariantTable();
        
        // 1. Put tokens in with basic classes
        //    and collect ceIds from tokens (so that we can get editorial notes later)
        $tokenCeIdsCollectorArray = [];
        foreach($sigla as $siglum) {
            $decoratedCollationTable[$siglum] = [];
            $tokenRefs = $c->getReferencesForRow($siglum);
            $witnessTokens = $c->getWitnessTokens($siglum);
            $witnessItemStream = $c->getWitness($siglum)->getItemStream();
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
                $addresses = $token->getSourceItemAddresses();
                $charRanges = $token->getSourceItemCharRanges();
                $decoratedToken['itemFormats'] = [];
                foreach($addresses as $i => $address) {
                    if (is_a($address, $addressInItemStreamClass)) {
                        if (!isset($tokenCeIdsCollectorArray[$address->getCeId()])) {
                            $tokenCeIdsCollectorArray[$address->getCeId()] = true;
                        }
                        $sourceItem = $witnessItemStream->getItemById($address->getItemIndex());
                        if ($sourceItem !== false && is_a($sourceItem, $textualItemClass)) {
                            list($text, $classes, $popover) = $formatter->getTextualItemFormat($sourceItem, false);
                            // fix the text!
                            $text = $this->getSubstringFromItemAndRange($sourceItem, $charRanges[$i]);
                            $decoratedToken['itemFormats'][] = [ 
                                'text' => $text, 
                                'classes' => $classes, 
                                'popoverHtml' => $popover, 
                                'postNotes' => [], 
                                'preNotes' => [],
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
        
//        $tokenCeIds = array_keys($tokenCeIdsCollectorArray);

        
        
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
    
    
}
