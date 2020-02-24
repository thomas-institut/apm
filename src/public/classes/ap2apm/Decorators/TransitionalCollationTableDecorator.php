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

use APM\Core\Address\IntRange;
use APM\Core\Collation\CollationTableDecorator;
use APM\Core\Collation\CollationTable;

use APM\Core\Item\Item;
use APM\Core\Item\MarkType;
use APM\Core\Token\TranscriptionToken;
use APM\FullTranscription\ApmTranscriptionWitness;
use AverroesProjectToApm\AddressInDatabaseItemStream;
use APM\Core\Item\TextualItem;
use APM\Core\Item\Mark;
use AverroesProjectToApm\ApUserDirectory;
use AverroesProjectToApm\Formatter\WitnessPageFormatter;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;

/**
 * Decorator for AverroesProject collation tables
 *
 * It assumes that the CollationTable object contains ONLY witnesses of
 * type ItemStreamWitness
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TransitionalCollationTableDecorator implements CollationTableDecorator, LoggerAwareInterface, CodeDebugInterface {

    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;
    
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
        //$this->codeDebug('Starting decoration');
        $sigla = $c->getSigla();
        //$this->codeDebug('Sigla', $sigla);
        $decoratedCollationTable = [];
        
        $decoratedCollationTable['extra'] = [];
        
        $addressInItemStreamClass  = AddressInDatabaseItemStream::class;
        $apmTranscriptionWitnesClass = ApmTranscriptionWitness::class;

        $textualItemClass = $this->textualItemClass;

        $apmTranscriptionWitnesClass = ApmTranscriptionWitness::class;
        
        $formatter = new WitnessPageFormatter($this->ud);
        $variantTable = $c->getVariantTable();
        
        // 1. Put tokens in with basic classes
        foreach($sigla as $siglum) {
            $this->codeDebug("Processing siglum '$siglum'");
            $decoratedCollationTable[$siglum] = [];
            
            $tokenRefs = $c->getReferencesForRow($siglum);
            $witnessTokens = $c->getWitnessTokens($siglum);
            /** @var ApmTranscriptionWitness $witness */
            $witness = $c->getWitness($siglum);
            if (!is_a($witness, $apmTranscriptionWitnesClass)) {
                $this->logger->warning("Found unsupported witness class in collation table: " . get_class($witness));
                continue;
            }

            $rawNonTokenItemIndexes = $witness->getNonTokenItemIndexes();
            
            $nonTokenItemIndexes = $this->aggregateNonTokenItemIndexes($rawNonTokenItemIndexes, $tokenRefs);
            
            $itemArray = $witness->getItemArray();
            $witnessItemStream = $witness->getDatabaseItemStream();
            foreach($tokenRefs as $tokenIndex => $tokenRef) {
                //$this->codeDebug("Processing token $i");
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
                /** @var TranscriptionToken $token */
                $decoratedToken['text'] = $token->getText();
                $decoratedToken['norm'] = $token->getNormalization();
                $decoratedToken['classes'] = [self::CLASS_NORMALTOKEN];
                $decoratedToken['classes'][] = self::CLASS_VARIANT_PREFIX .  $variantTable[$siglum][$tokenIndex];
                $decoratedToken['variant'] = $variantTable[$siglum][$tokenIndex];
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
                $lineStart = $token->getTextBoxLineRange()->getStart()->getCoord(1);
                $decoratedToken['itemFormats'] = [];
                foreach($addresses as $addressIndex => $address) {
                    if (is_a($address, $addressInItemStreamClass)) {
                        /** @var AddressInDatabaseItemStream  $address */
                        $sourceItem = $witnessItemStream->getItemById($address->getItemIndex());
                        /** @var Item $sourceItem */
                        if ($sourceItem !== false && is_a($sourceItem, $textualItemClass)) {
                            /** @var TextualItem $sourceItem */
                            $formattedItem = $formatter->getTextualItemFormat($sourceItem, false);
                            $classes = $formattedItem['classes'];
                            $popover = $formattedItem['popoverHtml'];
                            $text = $this->getSubstringFromItemAndRange($sourceItem, $charRanges[$addressIndex]);
                            if ($text === '' and $sourceItem->getPlainText() !== '') {
                                $theStr = $sourceItem->getPlainText();
                                $itemData = $sourceItem->getData();
                                $range = $charRanges[$addressIndex];
                                $itemIndex = $address->getItemIndex();
                                $this->codeDebug("Got empty substring from '$theStr', start " .
                                    $range->getStart() . " length " . $range->getLength() .
                                    ", itemIndex $itemIndex, tokenText: '" . $token->getText() . "'" ,
                                    [ 'count addresses' => count($addresses), 'tokenIndex' => $tokenIndex]);
                            }

                            $decoratedToken['itemFormats'][] = [ 
                                'text' => $text, 
                                'classes' => $classes, 
                                'popoverHtml' => $popover, 
                                'itemId' => $address->getItemIndex(),
                                'itemSeq' => $address->getItemSeq(),
                                'ceId' => $address->getCeId(),
                                'startChar' => $charRanges[$addressIndex]->getStart(),
                                'length' => $charRanges[$addressIndex]->getLength(),
                                'deletion' => $formattedItem['deletion'],
                                'format' => $formattedItem['format'],
                                'normalization' => $formattedItem['normalization'],
                                'normalizationType' => $formattedItem['normalizationType'],
                                'textualFlow' => $formattedItem['textualFlow'],
                                'location' => $formattedItem['location'],
                                'formattedItem' => $formattedItem
                            ];
                        }
//                        else {
//                            $this->codeDebug('Non textual item found ', [$sourceItem->getData()]);
//                        }
                    } else {
                        $this->codeDebug('Non supported address class found ' . get_class($address));
                    }
                }
                if (count($addresses) >= 1) {
                    // report only the first address
                    $address = $addresses[0];


                    if (!isset($decoratedToken['itemFormats'][0])) {
                        // happens when a TextboxBreak Mark creeps in!
                        $addressCount = count($addresses);
                        //$this->codeDebug("itemFormats[0] not defined in '$siglum', token $tokenIndex, address count $addressCount", $decoratedToken['itemFormats']);

                        $classes = [];
                        $popoverHtml = '';
                    } else {
                        //$classes =  $decoratedToken['itemFormats'][0]['classes'];
                        //$popoverHtml =  $decoratedToken['itemFormats'][0]['popoverHtml'];
                        $classes = [];
                        $popoverHtml = '';
                    }

                    // Add address to popover
                    array_push($classes, WitnessPageFormatter::CLASS_WITHPOPOVER);
                    
                    $decoratedToken['addressHtml'] = '<b>Page: </b> ' . $address->getFoliation() . '<br/>' .
                        '<b>Column: </b> ' . $address->getColumn() . '<br/>' .
                        '<b>Line: </b>' . $lineStart;
                    $decoratedToken['classes'] = array_merge($decoratedToken['classes'], $classes);
                    $decoratedToken['popoverHtml'] = $popoverHtml;
                }
                
                $decoratedCollationTable[$siglum][] = $decoratedToken;
            }
        }
        
        return $decoratedCollationTable;
    }
    
    
   
    
    protected function getSubstringFromItemAndRange(Item $item, IntRange $range) : string {
        $sourceString = $item->getPlainText();
        $subStr = mb_substr($sourceString, $range->getStart(), $range->getLength());

//        if ($sourceString !== '' && $subStr === '' && $range->getLength() !== 0) {
//            $this->codeDebug("Got empty subtring from '$sourceString', start " . $range->getStart() . " length " . $range->getLength(), [$item]);
//        }
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
        
        if (is_a($var, $this->markItemClass) && ($var->getMarkType() === MarkType::NOTE))  {
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
     * @param array $rawNonTokenItemIndexes
     * @param array $tokenRefs
     * @return array
     */
    protected function aggregateNonTokenItemIndexes(array $rawNonTokenItemIndexes, array $tokenRefs) {
        
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
