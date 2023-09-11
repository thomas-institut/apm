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

namespace APM\System\Decorators;

use APM\Core\Address\IntRange;
use APM\Core\Address\Point;
use APM\Core\Collation\CollationTableDecorator;
use APM\Core\Collation\CollationTable;

use APM\Core\Item\Item;
use APM\Core\Item\MarkType;
use APM\Core\Token\TranscriptionToken;
use APM\FullTranscription\ApmTranscriptionWitness;
use AverroesProjectToApm\AddressInDatabaseItemStream;
use APM\Core\Item\TextualItem;
use APM\Core\Item\Mark;
use AverroesProjectToApm\Formatter\WitnessPageFormatter;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\UserManager\PersonInfoProvider;
use ThomasInstitut\UserManager\SimplePersonInfoProvider;

/**
 * Decorator for AverroesProject collation tables
 *
 * It assumes that the CollationTable object contains ONLY witnesses of
 * type ItemStreamWitness
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApmCollationTableDecorator implements CollationTableDecorator, LoggerAwareInterface, CodeDebugInterface {

    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;
    
    const CLASS_EMPTYTOKEN = 'tokennotpresent';
    const CLASS_NORMALTOKEN = 'normalToken';
    const CLASS_VARIANT_PREFIX = 'variant_';
    
    const TEXT_EMPTYTOKEN = '&mdash;';

    /** @var string */
    protected $textualItemClass;
    /** @var string */
    protected $markItemClass;
    /**
     * @var PersonInfoProvider
     */
    private $userInfoProvider;


    public function __construct() {
        $this->userInfoProvider = new SimplePersonInfoProvider();
        $this->textualItemClass = TextualItem::class;
        $this->markItemClass = Mark::class;
    }

    public function setUserInfoProvider(PersonInfoProvider $provider) {
        $this->userInfoProvider = $provider;
    }
    
    public function decorate(CollationTable $c): array {

        $decoratedCollationTable = $c->getData();

        // collect data for userIds in notes
        $people = [];

        foreach($decoratedCollationTable['witnesses'] as $witness) {
            foreach($witness['items'] as $itemWithAddress) {
                $theItem = $itemWithAddress['item'];
                foreach ($theItem['notes'] as $note) {
                  if (!isset($people[$note['authorId']])) {
                      $people[$note['authorId']] = [
                          'fullName' => $this->userInfoProvider->getNormalizedName($note['authorId']),
                          'shortName'=> $this->userInfoProvider->getShortName($note['authorId'])
                      ];
                  }
                }
            }
        }
        $decoratedCollationTable['people'] = $people;

        // aggregate non token indexes for each witness
        // Attention: the keys of each aggregatedIndexes array refers to the
        // an item index!

        foreach($decoratedCollationTable['witnesses'] as $witnessIndex => $witnessData) {
            $rawNonTokenItemIndexes = $witnessData['nonTokenItemIndexes'];
            $tokenRefs = $decoratedCollationTable['collationMatrix'][$witnessIndex];
            $aggregatedIndexes = $this->aggregateNonTokenItemIndexes($rawNonTokenItemIndexes, $tokenRefs);
            $decoratedCollationTable['aggregatedNonTokenItemIndexes'][$witnessIndex] = $aggregatedIndexes;
        }



        return $decoratedCollationTable;
    }
    
    
   
    
    protected function getSubstringFromItemAndRange(Item $item, IntRange $range) : string {
        $sourceString = $item->getPlainText();
        return mb_substr($sourceString, $range->getStart(), $range->getLength());
    }
    
    protected function prettyPrintAddressInItemStream(Point $address) : string {
        
        return $this->prettyPrintPoint($address);
    }
    
    protected function prettyPrintPoint(Point $point) {
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
