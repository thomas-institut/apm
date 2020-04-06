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


use APM\Core\Token\TranscriptionToken;
use stdClass;

class TranscriptionTokenDataProvider implements StandardDataProvider
{

    /**
     * @var TranscriptionToken
     */
    private $token;

    public function __construct(TranscriptionToken $token)
    {
        $this->token = $token;
    }

    public function getStandardData()
    {
        $data = (new TokenDataProvider($this->token))->getStandardData();

        $data->tokenClass = StandardTokenClass::FULL_TX;

        $itemIndexes =  $this->token->getSourceItemIndexes();
        $charRanges = $this->token->getSourceItemCharRanges();

        $data->sourceItems = [];
        for($i = 0; $i < count($itemIndexes); $i++) {
            $itemData = new stdClass();
            $itemData->index = $itemIndexes[$i];
            $itemCharRange = $charRanges[$i];
            $itemData->charRange = StandardIntRange::getStandardIntRangeWithLength($itemCharRange->getStart(),
                $itemCharRange->getEnd(), $itemCharRange->getLength());
            $data->sourceItems[] = $itemData;
        }

        $startLine = $this->token->getTextBoxLineRange()->getStart();
        $endLine = $this->token->getTextBoxLineRange()->getEnd();
        $startTextBox = $startLine->getCoord(0);
        $endTextBox = $endLine->getCoord(0);
        $data->textBox = StandardIntRange::getStandardIntRange($startTextBox, $endTextBox);
        $data->line = StandardIntRange::getStandardIntRange($startLine->getCoord(1), $endLine->getCoord(1));

        return $data;
    }
}