<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace APM\StandardData;


use APM\Core\Transcription\ItemInDocument;
use APM\Core\Witness\TranscriptionWitness;
use APM\FullTranscription\ApmTranscriptionWitness;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use stdClass;

class FullTxWitnessDataProvider implements StandardDataProvider
{

    /**
     * @var ApmTranscriptionWitness
     */
    private ApmTranscriptionWitness $witness;

    public function __construct(ApmTranscriptionWitness $witness)
    {
        $this->witness = $witness;
    }

    /**
     * @inheritDoc
     */
    public function getStandardData()
    {

        $data = (new WitnessDataProvider($this->witness))->getStandardData();
        $data->witnessType = WitnessType::FULL_TRANSCRIPTION;
        $data->timeStamp = $this->witness->getTimeStamp();
        $data->docId = $this->witness->getDocId();

        $data->ApmWitnessId = WitnessSystemId::buildFullTxId($this->witness->getWorkId(),
            $this->witness->getChunk(), $this->witness->getDocId(), $this->witness->getLocalWitnessId(),
            $this->witness->getTimeStamp());
        $data->tokens = [];
        foreach($this->witness->getTokens() as $token) {
            $data->tokens[] = (new TranscriptionTokenDataProvider($token))->getStandardData();
        }
        $data->items = $this->getItemDataArray();
        $data->nonTokenItemIndexes = $this->getNonTokenItemIndexes();
        return $data;
    }

    protected function getItemDataArray() : array {
        $itemArray = [];
        $itemWithAddressArray = $this->witness->getItemWithAddressArray();
        foreach($itemWithAddressArray as $itemIndex => $itemWithAddress) {
            /** @var ItemInDocument $itemWithAddress */
            $theItem = $itemWithAddress->getItem();
            $theAddress = $itemWithAddress->getAddress();
            $itemData = (new ItemDataProvider($theItem))->getStandardData();
            // get rid of redundant language info
            if (isset($itemData->language) && $itemData->language === $this->witness->getLang()) {
                unset($itemData->language);
            }
            $itemData->address = $theAddress->getData();
            //$itemData->class = 'ItemInDocument'; // ItemInDocument is the default
            $itemArray[] = $itemData;
        }
        return $itemArray;
    }

    protected function getNonTokenItemIndexes() : array {
        $nonTokenItemIndexes = $this->witness->getNonTokenItemIndexes();

        $cleanedUpArray = [];
        foreach($nonTokenItemIndexes as $i => $indexes) {
            if ($indexes['post'] !== [] || $indexes['pre'] !== []) {
                $cleanedUpArray[$i] = (object) $indexes;
            }
        }
        return $cleanedUpArray;
    }
}