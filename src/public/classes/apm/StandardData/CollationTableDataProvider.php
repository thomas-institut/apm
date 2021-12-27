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


use APM\Core\Collation\CollationTable;
use APM\Core\Witness\EditionWitness;
use APM\Core\Witness\TranscriptionWitness;
use APM\FullTranscription\ApmTranscriptionWitness;
use InvalidArgumentException;
use stdClass;

class CollationTableDataProvider implements StandardDataProvider
{


    /**
     * @var CollationTable
     */
    private CollationTable $ct;

    public function __construct(CollationTable $ct)
    {
        $this->ct = $ct;
    }

    /**
     * @inheritDoc
     */
    public function getStandardData(): stdClass
    {

        $apmTxWitnessClass = ApmTranscriptionWitness::class;
        $editionWitnessClass = EditionWitness::class;

        $data = new stdClass();
        $data->lang = $this->ct->getLanguage();
        $data->sigla = $this->ct->getSigla();
        $data->groupedColumns = [];
        $data->witnessTitles = [];
        $data->siglaGroups = [];
        $data->type = $this->ct->isEdition() ? CollationTableType::EDITION : CollationTableType::COLLATION_TABLE;
        $data->title = $this->ct->getTitle();


        $witnessDataArrays = [];
        $matrix = [];
        foreach($data->sigla as $i => $siglum) {
            $witness = $this->ct->getWitness($siglum);
            $data->witnessTitles[$i] = $this->ct->getWitnessTitle($siglum);
            if ($this->ct->isEdition() && $siglum === $this->ct->getEditionWitnessSiglum()) {
                $data->editionWitnessIndex = $i;
            }
            switch(get_class($witness)) {
                case $apmTxWitnessClass:
                    /** @var ApmTranscriptionWitness  $witness */
                    $witnessDataArrays[$i] = (new FullTxWitnessDataProvider($witness))->getStandardData();
                    $matrix[$i] = $this->ct->getReferencesForRow($siglum);
                    $data->chunkId = $witness->getWorkId() . "-" . $witness->getChunk();
                    break;

                case $editionWitnessClass:
                    /** @var EditionWitness $witness */
                    $witnessDataArrays[$i] = (new EditionWitnessDataProvider($witness))->getStandardData();
                    $matrix[$i] = $this->ct->getReferencesForRow($siglum);
                    break;

                default:
                    throw new InvalidArgumentException("Non supported class from $siglum  witness: " . get_class($witness));
            }


        }
        $data->witnesses = $witnessDataArrays;
        $data->collationMatrix = $matrix;
        return $data;
    }

    public function getUserIdsFromData($data) : array {
        // collect userIds in notes
        $people = [];

        foreach($data->witnesses as $witness) {
            foreach($witness->items as $itemData) {
                if (isset($itemData->notes)) {
                    foreach($itemData->notes as $note) {
                        if (!isset($people[$note['authorId']])) {
                            $people[$note['authorId']] = true;
                        }
                    }
                }
            }
        }
        return array_keys($people);
    }


}