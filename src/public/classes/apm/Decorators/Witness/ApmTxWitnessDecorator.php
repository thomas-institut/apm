<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

namespace APM\Decorators\Witness;


use APM\Core\Address\IntRange;
use APM\Core\Collation\CollationTable;
use APM\Core\Item\Item;
use APM\Core\Item\Mark;
use APM\Core\Item\MarkType;
use APM\Core\Item\Note;
use APM\Core\Item\TextualItem;
use APM\Core\Token\TranscriptionToken;
use APM\Core\Witness\Witness;
use APM\Core\Witness\WitnessDecorator;
use APM\FullTranscription\ApmTranscriptionWitness;
use AverroesProjectToApm\AddressInDatabaseItemStream;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;

class ApmTxWitnessDecorator implements WitnessDecorator, CodeDebugInterface, LoggerAwareInterface
{

    use CodeDebugWithLoggerTrait;
    use LoggerAwareTrait;
    /**
     * @inheritDoc
     */
    public function getDecoratedTokens(Witness $w): array
    {

        $apmTranscriptionWitnessClass = ApmTranscriptionWitness::class;
        $addressInItemStreamClass = AddressInDatabaseItemStream::class;
        $textualItemClass = TextualItem::class;
        $decoratedTokens = [];
        $witnessTokens = $w->getTokens();

        if (!is_a($w, $apmTranscriptionWitnessClass)) {
            return (new GenericWitnessDecorator())->getDecoratedTokens($w);
        }

        /** @var ApmTranscriptionWitness $w */
        $rawNonTokenItemIndexes = $w->getNonTokenItemIndexes();
        $itemArray = $w->getItemArray();
        $witnessItemStream = $w->getDatabaseItemStream();
        foreach($witnessTokens as $tokenIndex => $token) {
            $decoratedToken = [];
            /** @var TranscriptionToken $token */
            $decoratedToken['class'] = 'transcription';
            $decoratedToken['text'] = $token->getText();
            $decoratedToken['norm'] = $token->getNormalization();
            $decoratedToken['tokenIndex'] = $tokenIndex;
            $decoratedToken['itemIndexes'] = $token->getSourceItemIndexes();
            $decoratedToken['postNotes'] = [];
            if ($rawNonTokenItemIndexes[$tokenIndex]['post'] !== []) {
                // There are non-token items after the token
                // check if there are notes
                foreach($rawNonTokenItemIndexes[$tokenIndex]['post'] as $itemIndex)  {
                    if ($this->isNoteMark($itemArray[$itemIndex]->getItem())){
                        $noteArray = $itemArray[$itemIndex]->getItem()->getNotes();
                        foreach($noteArray as $note) {
                            /** @var Note $note */
                            $decoratedToken['postNotes'][] = [
                                'text' => $note->getText(),
                                'authorId' => $note->getAuthor(),
                                'time' => $note->getTime()
                            ];
                        }
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
                        $itemData = $sourceItem->getData();
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
                            'itemId' => $address->getItemIndex(),
                            'itemSeq' => $address->getItemSeq(),
                            'ceId' => $address->getCeId(),
                            'startChar' => $charRanges[$addressIndex]->getStart(),
                            'length' => $charRanges[$addressIndex]->getLength(),
                            'itemData' => $itemData
                        ];
                    }
                } else {
                    $this->codeDebug('Non supported address class found ' . get_class($address));
                }
            }
            $decoratedTokens[] = $decoratedToken;
        }

       return $decoratedTokens;

    }

    protected  function isNoteMark($var) {
        if (!is_object($var)) {
            return false;
        }

        $markItemClass = Mark::class;

        if (is_a($var, $markItemClass) && ($var->getMarkType() === MarkType::NOTE))  {
            return true;
        }
        return false;
    }

    protected function getSubstringFromItemAndRange(Item $item, IntRange $range) : string {
        $sourceString = $item->getPlainText();
        return mb_substr($sourceString, $range->getStart(), $range->getLength());
    }


}