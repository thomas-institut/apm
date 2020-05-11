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


use APM\Core\Item\Item;

class ItemDataProvider implements StandardDataProvider
{

    /**
     * @var Item
     */
    private $item;

    public function __construct(Item $item)
    {
        $this->item = $item;
    }

    /**
     * @inheritDoc
     */
    public function getStandardData()
    {

        $itemData = (object) $this->item->getData();

        // for the time being, just simplify the data a little bit

        if (isset($itemData->normalization) && $itemData->normalization === $itemData->text) {
            unset($itemData->normalization);
        }

        if (isset($itemData->format) && $itemData->format==='') {
            unset($itemData->format);
        }

        if (isset($itemData->location) && $itemData->location==='') {
            unset($itemData->location);
        }

        if (isset($itemData->normalizationType) && $itemData->normalizationType==='') {
            unset($itemData->normalizationType);
        }

        if (isset($itemData->clarityReason) && $itemData->clarityReason==='') {
            unset($itemData->clarityReason);
        }
        if (isset($itemData->deletion) && $itemData->deletion==='') {
            unset($itemData->deletion);
        }
        if (isset($itemData->hand) && $itemData->hand===0) {
            unset($itemData->hand);
        }
        if (isset($itemData->textualFlow) && $itemData->textualFlow===0) {
            unset($itemData->textualFlow);
        }
        if (isset($itemData->clarity) && $itemData->clarity===1.0) {
            unset($itemData->clarity);
        }
        if (isset($itemData->notes) && $itemData->notes===[]) {
            unset($itemData->notes);
        }
        if (isset($itemData->alternateTexts) && $itemData->alternateTexts===[]) {
            unset($itemData->alternateTexts);
        }

        // reduce nowb and note marks to a minimum
        if ($itemData->type === "Mark" && ($itemData->markType === '__nowb' ||$itemData->markType==='note')) {
            unset($itemData->text);
            unset($itemData->markText);
            unset($itemData->length);
        }

        return $itemData;

    }
}