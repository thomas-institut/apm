<?php

/*
 * 
 * Copyright (C) 2018 Universität zu Köln
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

namespace APM\Core\Witness;

use APM\Core\Transcription\ItemInDocument;
use APM\Core\Item\TextualItem;
use APM\Core\Item\NoWbMark;
use APM\Core\Token\StringTokenizer;
use APM\Core\Token\TranscriptionToken;
use APM\Core\Token\StringToken;
use APM\Core\Token\Token;
use APM\Core\Address\PointRange;
use APM\Core\Address\IntRange;
/**
 * A Witness whose source is a DocumentTranscription.
 * 
 * It is up to the descendants of the class to decide whether to store
 * the whole source or some reference to a storage place.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class TranscriptionWitness extends Witness {
    /**
     * Returns and array of ItemInDocument objects that 
     * represents the source transcription and from which
     * the tokens will be constructed
     */
    abstract function getItemArray() : array;
    
    /**
     * Returns an array of TranscriptionToken
     * @return array
     */
    public function getTokens() : array {
        
        // 1. Get some important class names
        $textualItemClass = get_class(new TextualItem('n/a'));
        $noWbItemClass = get_class(new NoWbMark());
        
        // 2. Get the items
        $sourceItems = $this->getItemArray();
        if ($sourceItems === []) {
            return [];
        }
        
        // 3. Initialize arrays and counters
        $tokens = [];
        $currentPage = $sourceItems[0]->getAddress()->getPageId();
        $currentTextBox = $sourceItems[0]->getAddress()->getTbIndex();
        $pageTextBoxCurrentLines = [];
        $pageTextBoxCurrentLines[$currentTextBox] = 1;
        $openWordToken = false;
        $noWbItemOpen = false;
        $currentWordToken = new TranscriptionToken(Token::TOKEN_EMPTY, '');
        
        // 4. Iterate over all items in the transcription
        foreach ($sourceItems as $sourceItem) {
            /* @var $sourceItem ItemInDocument */
            
            $rawItem = $sourceItem->getItem();
            $itemAddress = $sourceItem->getAddress();
            
            if ($itemAddress->getPageId() !== $currentPage ||
                    $itemAddress->getTbIndex() !== $currentTextBox) {
                // new page or text box, reset all counters
                $currentPage = $itemAddress->getPageId();
                $currentTextBox = $itemAddress->getTbIndex();
                $pageTextBoxCurrentLines = [];
                $pageTextBoxCurrentLines[$currentTextBox] = 1;
                if ($openWordToken) {
                    // Close open word token
                    $tokens[] = $currentWordToken;
                    $openWordToken = false;
                }
            }
            
            if (is_a($rawItem, $textualItemClass)) {
                // Textual item: get the internal tokens and process them
                // 
                // Notice that tokens are constructed out of the normalized 
                // text, not the "original" text
                $stringTokens = StringTokenizer::getTokensFromString($rawItem->getNormalizedText());
                foreach($stringTokens as $stringToken) {
                    /* @var $stringToken StringToken */
                    $tToken =  new TranscriptionToken($stringToken->getType(), 
                            $stringToken->getText(), $stringToken->getNormalization());
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
                    if ($tToken->getType() === Token::TOKEN_WORD) {
                        if ($openWordToken) {
                            // open word token : add text to currentWordToken
                            $currentWordToken = TranscriptionToken::addTokens($currentWordToken, $tToken);
                            // close noWbItem 
                            $noWbItemOpen = false;
                        }  else {
                            // closed word token : open a new currentWordToken
                            $currentWordToken = $tToken;
                            $openWordToken = true;
                        }
                    } else {
                        if ($noWbItemOpen && $tToken->getType()=== Token::TOKEN_WS && $tToken->getText() === "\n") {
                            // got a newline after a noWbItem, ignore
                        } else {
                            // Any other token type: "close" currentWordToken and
                            // add it to the token array
                            $tokens[] = $currentWordToken;
                            $openWordToken = false;
                            $noWbItemOpen = false;
                            // Add the token just processed as well
                            $tokens[] = $tToken;
                        }
                    }
                    if ($pageTextBoxCurrentLines[$currentTextBox] < $stringToken->getLineRange()->getEnd() ) {
                        // Line change in text box
                        $pageTextBoxCurrentLines[$currentTextBox] = $stringToken->getLineRange()->getEnd();
                    }
                }
                continue; // next StringToken
            }
            
            if (is_a($rawItem, $noWbItemClass)) {
                if ($openWordToken) {
                    // just add the item info to the item addresses of the current token
                    $currentWordToken->setSourceItemAddresses(array_merge(
                        $currentWordToken->getSourceItemAddresses(), 
                        [$itemAddress]
                        )
                    );
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
            if ($openWordToken) {
                // Close word token
                $tokens[] = $currentWordToken;
                $openWordToken = false;
            }
        }
        // If there's still an openToken, close it
        if ($openWordToken) {
            $tokens[] = $currentWordToken;
            $openWordToken = false;
        }
        return $tokens;
    }

}