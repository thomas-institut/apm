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
        $variantTable = $this->buildVariantTable($c);
        
        // 1. Put tokens in with basic classes
        foreach($sigla as $siglum) {
            $decoratedCollationTable[$siglum] = [];
            $tokenRefs = $c->getWitnessCollationRawTokens($siglum);
            $witnessTokens = $c->getWitnessTokens($siglum);
            $witnessItemStream = $c->getWitness($siglum)->getItemStream();
            foreach($tokenRefs as $i => $tokenRef) {
                $decoratedToken = [];
                if ($tokenRef === CollationTable::TOKENREF_NULL) {
                    $decoratedToken['text'] = self::TEXT_EMPTYTOKEN;
                    $decoratedToken['classes'] = [self::CLASS_EMPTYTOKEN];
                    $decoratedToken['empty'] = true;
                    $decoratedCollationTable[$siglum][] = $decoratedToken;
                    continue;
                }
                $token = $witnessTokens[$tokenRef];
                $decoratedToken['text'] = $token->getText();
                $decoratedToken['classes'] = [self::CLASS_NORMALTOKEN];
                $decoratedToken['classes'][] = self::CLASS_VARIANT_PREFIX .  $variantTable[$siglum][$i];
                //$decoratedToken['lineNumber'] = '.';
                $decoratedToken['empty'] = false;
                $decoratedToken['witnessTokenIndex'] = $tokenRef;
                $addresses = $token->getSourceItemAddresses();
                //$decoratedToken['itemAddresses'] = [];
                $decoratedToken['itemFormats'] = [];
                foreach($addresses as $address) {
                    if (is_a($address, $addressInItemStreamClass)) {
                        //$decoratedToken['itemAddresses'][] = $address;
                        $sourceItem = $witnessItemStream->getItemById($address->getItemIndex());
                        if ($sourceItem !== false && is_a($sourceItem, $textualItemClass)) {
                            $sourceItem->setPlainText($token->getText());
                            $decoratedToken['itemFormats'][] = $formatter->getTextualItemFormat($sourceItem, false);
                        }
                    }
                }
                if (count($addresses) === 1) {
                    // the simplest case!
                    $address = $addresses[0];
                    list($text, $classes, $popoverHtml) = $decoratedToken['itemFormats'][0];
                    // Add address to popover
                    array_push($classes, \AverroesProjectToApm\Formatter\WitnessPageFormatter::CLASS_WITHPOPOVER);
                    $popoverHtml .= '[' . $address->getFoliation() . ':c' . $address->getColumn() . ']';
                    $decoratedToken['classes'] = array_merge($decoratedToken['classes'], $classes);
                    $decoratedToken['popoverHtml'] = $popoverHtml;
                }
                
                $decoratedCollationTable[$siglum][] = $decoratedToken;
            }
        }
        
        
        
        // 2. Put line breaks
//        $bd = new \APM\Core\Algorithm\BoundaryDetector();
//        $isEmptyFunc = function ($t) { return $t['empty'];};
//        $getLineNumberFunc = function($t) { return $t['lineNumber']; };
//        
//        foreach($decoratedCollationTable as $siglum => &$decoratedTokens)  {
//            $lineBreakIndexes = $bd->findBoundaries($decoratedTokens, $getLineNumberFunc, $isEmptyFunc);
//            foreach($lineBreakIndexes as $lbIndex) {
//                if ($decoratedTokens[$lbIndex]['empty'] === false) {
//                    $decoratedTokens[$lbIndex]['lineBreak'] = true;
//                }
//            }
//        }
        
        
        return $decoratedCollationTable;
    }
    
    
    protected function buildVariantTable(CollationTable $c) : array {
        $tokenCount = $c->getTokenCount();
        $variantTable = [];
        $sigla = $c->getSigla();
        foreach($sigla as $siglum) {
            $variantTable[$siglum] = [];
        }
        
        for ($i = 0; $i< $tokenCount; $i++) {
            $column = $c->getColumn($i);
            $readings = [];
            foreach($column as $siglum => $token) {
                if ($token->isEmpty()) {
                    continue;
                }
                if (!isset($readings[$token->getNormalization()])) {
                    $readings[$token->getNormalization()] = 0;
                }
                $readings[$token->getNormalization()]++;
            }
            $rankings = array_keys($readings);
            
            
            foreach($column as $siglum => $token) {
                $variantTable[$siglum][] = intVal(array_search($token->getText(), $rankings));
            }
        }
        return $variantTable;
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
