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

namespace APM\Core\Witness;

use APM\Core\Token\TokenType;
use APM\Core\Transcription\ItemAddressInDocument;
use APM\Core\Transcription\ItemInDocument;
use APM\Core\Item\TextualItem;
use APM\Core\Item\NoWbMark;
use APM\Core\Token\StringTokenizer;
use APM\Core\Token\TranscriptionToken;
use APM\Core\Token\StringToken;
use APM\Core\Address\PointRange;
use APM\Core\Address\IntRange;

/**
 * A Witness whose source is a part of a DocumentTranscription.
 *
 * The witness source is an array of ItemInDocument objects, representing items located in
 * a DocumentTranscription
 *
 * It is up to the descendants of the class to decide whether to store
 * the whole source or some reference to a storage place.
 *
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class TranscriptionWitness extends Witness {

    /**
     * Returns and array of ItemInDocument objects that
     * represents the source transcription and from which
     * the tokens will be constructed.
     *
     *
     * @return ItemInDocument[]
     */
    abstract function getItemWithAddressArray() : array;

    /**
     * @param int $pageId
     * @param int $textBox
     * @return int
     */
    public function getInitialLineNumberForTextBox(int $pageId, int $textBox) : int {
        // TODO: implement this!!!
        return 1;
    }
    
    /**
     * Returns an array of TranscriptionToken
     * @return TranscriptionToken[]
     */
    public function getTokens() : array {
        
        // 1. Get some important class names
        $textualItemClass = TextualItem::class;
        $noWbItemClass = NoWbMark::class;
        
        // 2. Get the items
        $sourceItems = $this->getItemWithAddressArray();
        if ($sourceItems === []) {
            return [];
        }
        
        // 3. Initialize arrays and counters
        $tokens = [];
        $currentPage = $sourceItems[0]->getAddress()->getPageId();
        $currentTextBox = $sourceItems[0]->getAddress()->getTbIndex();
        $pageTextBoxCurrentLines = [];
        $pageTextBoxCurrentLines[$currentTextBox] = $this->getInitialLineNumberForTextBox($currentPage, $currentTextBox);
        $openWordToken = false;
        $noWbItemOpen = false;
        $currentWordToken = new TranscriptionToken(TokenType::EMPTY, '');

        $tokenizer = new StringTokenizer();
        
        // 4. Iterate over all items in the transcription
        foreach ($sourceItems as $itemIndex => $sourceItem) {
            /* @var $sourceItem ItemInDocument */

            $rawItem = $sourceItem->getItem();
            /* @var $itemAddress ItemAddressInDocument */
            $itemAddress = $sourceItem->getAddress();

            if ($itemAddress->getPageId() !== $currentPage ||
                    $itemAddress->getTbIndex() !== $currentTextBox) {
                // new page or text box, reset all counters
                $currentPage = $itemAddress->getPageId();
                $currentTextBox = $itemAddress->getTbIndex();
                $pageTextBoxCurrentLines = [];
                $pageTextBoxCurrentLines[$currentTextBox] = $this->getInitialLineNumberForTextBox($currentPage, $currentTextBox);
                if ($openWordToken) {
                    // Close open word token
                    $tokens[] = $currentWordToken;
                    $openWordToken = false;
                }
            }
            
            // Handle a TextualItem
            if (is_a($rawItem, $textualItemClass)) {
                // Textual item: get the internal tokens and process them
                $rawItemNormalizedText = $rawItem->getNormalizedText();
                $rawItemPlainText = $rawItem->getPlainText();
                // Notice that tokens are constructed out of the normalized 
                // text, not the "original" text
                $stringTokens = $tokenizer->getTokensFromString($rawItemNormalizedText);
                foreach($stringTokens as $stringToken) {
                    /* @var $stringToken StringToken */
                    // Check if the string token covers all the text's item
                    if ($stringToken->getText() === $rawItemNormalizedText) {
                        // this means that there is only one token in the item,
                        // so, we can use the item's plain text and normalization 
                        // to build the TranscriptionToken
                            $tToken =  new TranscriptionToken($stringToken->getType(),
                                $rawItemPlainText, $rawItemNormalizedText);
                    } else {
                        $tToken =  new TranscriptionToken($stringToken->getType(), 
                            $stringToken->getText(), $stringToken->getNormalization());
                    }
                    // Build and store the token addresses and ranges
                    $tToken->setSourceItemIndexes([$itemIndex]);
                    $tToken->setSourceItemAddresses([$itemAddress]);
                    $tToken->setSourceItemCharRanges([$stringToken->getCharRange()]);
                    $tToken->setTextBoxLineRange(
                        new PointRange(
                        [
                            $currentTextBox, 
                            $pageTextBoxCurrentLines[$currentTextBox] + $stringToken->getLineRange()->getStart() - 1
                        ],
                        [
                           $currentTextBox, 
                            $pageTextBoxCurrentLines[$currentTextBox] + $stringToken->getLineRange()->getEnd() - 1 
                        ])
                    );
                    // Deal with open word tokens and NoWb
                    if ($tToken->getType() === TokenType::WORD) {
                        if ($openWordToken) {
                            // open word token : add text to currentWordToken
                            $currentWordToken = TranscriptionToken::addTokens($currentWordToken, $tToken);
                            // close noWbItem 
                            $noWbItemOpen = false;
                        }  else {
                            // closed word token : open a new currentWordToken
                            //print "A word token, making it the currentWordToken: '" . $tToken->getText() . "'\n" ;
                            $currentWordToken = $tToken;
                            $openWordToken = true;
                        }
                    } else { // i.e., not a word token
                        if ($noWbItemOpen && $tToken->getType()=== TokenType::WHITESPACE && $tToken->getText() === "\n") {
                            // got a newline after a noWbItem
                            // add the item index to the currenWord Token
                            $currentWordToken->setSourceItemAddresses(array_merge(
                                    $currentWordToken->getSourceItemAddresses(),
                                    [$itemAddress]
                                )
                            );
                            // add the item index
                            $currentWordToken->setSourceItemIndexes(array_merge($currentWordToken->getSourceItemIndexes(), [$itemIndex]));
                            // and a empty char range
                            $currentWordToken->setSourceItemCharRanges(array_merge(
                                    $currentWordToken->getSourceItemCharRanges(),
                                    [new IntRange(0)]
                                )
                            );
                        } else {
                            // Any other token type: "close" currentWordToken and
                            // add it to the token array
                            if ($openWordToken) {
                                $tokens[] = $currentWordToken;
                                $openWordToken = false;
                            }
                            $noWbItemOpen = false;
                            // Add the token just processed as well
                            $tokens[] = $tToken;
                        }
                    }
                    // advance current line
                    $pageTextBoxCurrentLines[$currentTextBox] = 
                        $pageTextBoxCurrentLines[$currentTextBox] + $stringToken->getLineRange()->getEnd() - 1 ;
//                    if ($pageTextBoxCurrentLines[$currentTextBox] < $stringToken->getLineRange()->getEnd() ) {
//                        // Line change in text box
//                        $pageTextBoxCurrentLines[$currentTextBox] = $stringToken->getLineRange()->getEnd();
//                    }
                }
                continue; // next StringToken
            } // rawItem is a TextualItem
            
            // Handle a NoWb Item
            if (is_a($rawItem, $noWbItemClass)) {
                if ($openWordToken) {
                    // just add the item info to the item addresses of the current token
                    $currentWordToken->setSourceItemAddresses(array_merge(
                        $currentWordToken->getSourceItemAddresses(), 
                        [$itemAddress]
                        )
                    );
                    // add the item index
                    $currentWordToken->setSourceItemIndexes(array_merge($currentWordToken->getSourceItemIndexes(), [$itemIndex]));
                    // and a empty char range
                    $currentWordToken->setSourceItemCharRanges(array_merge(
                        $currentWordToken->getSourceItemCharRanges(),
                        [new IntRange(0)]
                        )
                    );
                    $noWbItemOpen = true;
                }
                continue;
            }
            
            
            // Any other item type
            
            // TODO: handle "special items"
            //  - note mark
            //  - illegible mark
            //  - TextBox break mark
            //  - paragraph mark

            if ($openWordToken) {
                // Close word token
                $tokens[] = $currentWordToken;
                $openWordToken = false;
            }
            
            
        } // foreach sourceIteam
        // All source items processed
        // If there's still an openToken, close it
        if ($openWordToken) {
            $tokens[] = $currentWordToken;
            $openWordToken = false;
        }
        return $tokens;
    }

    /**
     * Returns a list of all the items that do not contribute
     * tokens.
     *
     * The returned array contains one element for each token. Each
     * element is itself an array with two keys: 'pre'  and 'post'
     * with the items that do not contribute tokens that appear immediately before and
     * inmediately after the corresponding token. Normally, only the first element
     * of the returned array, that is, the one corresponding to the first token,
     * will potentially have a non-empty 'pre' element.
     *
     *  For example, assume that a witness has the following sequence of items:
     *   0: note mark 1
     *   1: text = 'this is a'
     *   2: note mark 2
     *   3: text = ' witness'
     *   4: note mark 3
     *
     * The tokens are:
     *   0: This
     *   1: WHITESPACE
     *   2: is
     *   3: WHITESPACE
     *   4: a
     *   5: WHITESPACE
     *   6: witness
     *
     * The returned array will be :
     *
     *   0 => [ 'pre' => [ notemark1 ], 'post' => [] ],
     *   1 => [ 'pre' => [], 'post' => [] ],
     *   2 => [ 'pre' => [], 'post' => [] ],
     *   3 => [ 'pre' => [], 'post' => [] ],
     *   4 => [ 'pre' => [], 'post' => [ notemark2] ],
     *   5 => [ 'pre' => [], 'post' => [] ],
     *   6 => [ 'pre' => [], 'post' => [ notemark3] ]
     *
     * @return array
     */
    
    public function getNonTokenItemIndexes() : array {
        $itemArray = $this->getItemWithAddressArray();
        $tokenArray = $this->getTokens();
        $nonTokenIndexes = [];

        $previousTokenMaxItemIndex = -1;
        foreach ($tokenArray as $i => $token) {
            $nonTokenIndexes[$i] = [ 'pre' => [], 'post' => []];
            $curTokenMinItemItemIndex = min($token->getSourceItemIndexes());
            if ($curTokenMinItemItemIndex > $previousTokenMaxItemIndex+1) {
                // some items were skipped, namely all between $previousTokenMaxItemIndex
                //  and $curTokenMinItemItemIndex, non including those two
                for ($j = $previousTokenMaxItemIndex+1; $j < $curTokenMinItemItemIndex; $j++) {
                    if ($i !== 0) {
                        // add missing items to the previous token 'post' field
                        $nonTokenIndexes[$i-1]['post'][] = $j;
                    } else {
                        $nonTokenIndexes[0]['pre'][] = $j;
                    }
                }
            }
            $previousTokenMaxItemIndex = max($token->getSourceItemIndexes());
        }

        // all tokens are processed, but there might still be items beyond
        // the last item in the tokens
        $maxTokenIndex = count($tokenArray)-1;
        $maxItemIndex = count($itemArray)-1;
        $lastTokenMaxItemIndex = max($tokenArray[$maxTokenIndex]->getSourceItemIndexes());
        if ($maxItemIndex > $lastTokenMaxItemIndex ) {
            for ($j = $lastTokenMaxItemIndex+1; $j <= $maxItemIndex; $j++){
                $nonTokenIndexes[$maxTokenIndex]['post'][] = $j;
            }
        }
        return $nonTokenIndexes;

    }


}
