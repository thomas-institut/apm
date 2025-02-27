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

namespace Test\AverroesProjectToApm;

use AverroesProject\ColumnElement\Element;
use AverroesProjectToApm\AddressInDatabaseItemStream;
use PHPUnit\Framework\TestCase;

class AddressInDatabaseItemStreamTest extends TestCase
{
    public function testSimple()
    {
        // testRow, all values should be strings in order to mimic how they
        // come from the database
        $testRow = [
            'id' => '21',
            'seq' => '22',
            'ce_id' => '23',
            'e.seq' => '24',
            'col' => '25',
            'page_id' => '26',
            'p.seq' => '27',
            'foliation' => '28v',
            'e.type' => strval(Element::LINE)
        ];

        $address = new AddressInDatabaseItemStream();

        $address->setFromItemStreamRow(1, $testRow);

        $this->assertEquals(21, $address->getItemId());
        $this->assertEquals(21, $address->getItemIndex());
        $this->assertEquals(22, $address->getItemSeq());
        $this->assertEquals(23, $address->getCeId());
        $this->assertEquals(24, $address->getCeSeq());
        $this->assertEquals(25, $address->getColumn());
        $this->assertEquals(26, $address->getPageId());
        $this->assertEquals('28v', $address->getFoliation());
        $this->assertEquals(25, $address->getTbIndex());  // i.e., column Number

        // now without foliation
        unset($testRow['foliation']);

        $address = new AddressInDatabaseItemStream();

        $address->setFromItemStreamRow(1, $testRow);

        $this->assertEquals(21, $address->getItemId());
        $this->assertEquals(21, $address->getItemIndex());
        $this->assertEquals(22, $address->getItemSeq());
        $this->assertEquals(23, $address->getCeId());
        $this->assertEquals(24, $address->getCeSeq());
        $this->assertEquals(25, $address->getColumn());
        $this->assertEquals(26, $address->getPageId());
        $this->assertEquals('27', $address->getFoliation());
        $this->assertEquals(25, $address->getTbIndex());  // i.e., column Number

        // now with null foliation
        $testRow['foliation'] = null;
        $address = new AddressInDatabaseItemStream();

        $address->setFromItemStreamRow(1, $testRow);

        $this->assertEquals(21, $address->getItemId());
        $this->assertEquals(21, $address->getItemIndex());
        $this->assertEquals(22, $address->getItemSeq());
        $this->assertEquals(23, $address->getCeId());
        $this->assertEquals(24, $address->getCeSeq());
        $this->assertEquals(25, $address->getColumn());
        $this->assertEquals(26, $address->getPageId());
        $this->assertEquals('27', $address->getFoliation());
        $this->assertEquals(25, $address->getTbIndex());  // i.e., column Number

        // now with a different kind of element type
        $testRow['e.type'] = strval(Element::ADDITION);
        $address = new AddressInDatabaseItemStream();

        $address->setFromItemStreamRow(1, $testRow);
        $this->assertEquals(21, $address->getItemId());
        $this->assertEquals(21, $address->getItemIndex());
        $this->assertEquals(22, $address->getItemSeq());
        $this->assertEquals(23, $address->getCeId());
        $this->assertEquals(24, $address->getCeSeq());
        $this->assertEquals(25, $address->getColumn());
        $this->assertEquals(26, $address->getPageId());
        $this->assertEquals('27', $address->getFoliation());
        $this->assertEquals(23, $address->getTbIndex());  // i.e., element Id

        // test getData
        $expectedData = [
            'ceId' => 23,
            'column' => 25,
            'foliation' => '27',
            'itemSeq' => 22,
            'itemId' => 21,
            'ceSeq' => 24,
            'itemIndex' => 21,
            'textBoxIndex' => 23,
            'pageId' => 26
            ];

        $this->assertEquals($expectedData, $address->getData());
    }

    public function testData() {
        $inputJSON = '[{"id":"17781","type":"1","seq":"1","ce_id":"11565","lang":"la","hand_id":"0","text":"Eliza said that the rain in ","alt_text":null,"extra_info":null,"length":null,"target":null,"e.type":"1","page_id":"3675","col":"1","e.seq":"0","e.hand_id":"0","reference":"0","placement":null,"p.seq":"23","foliation":null},{"id":"17779","type":"11","seq":"2","ce_id":"11565","lang":"la","hand_id":"0","text":"Sp.","alt_text":"Spain","extra_info":null,"length":null,"target":null,"e.type":"1","page_id":"3675","col":"1","e.seq":"0","e.hand_id":"0","reference":"0","placement":null,"p.seq":"23","foliation":null},{"id":"17951","type":"1","seq":"3","ce_id":"11565","lang":"la","hand_id":"0","text":" is always in the  plane. ","alt_text":null,"extra_info":null,"length":null,"target":null,"e.type":"1","page_id":"3675","col":"1","e.seq":"0","e.hand_id":"0","reference":"0","placement":null,"p.seq":"23","foliation":null}] 
';

        $inputRows = json_decode($inputJSON, true);

        foreach($inputRows as $i => $row) {
            $address = new AddressInDatabaseItemStream();
            $address->setFromItemStreamRow(1, $row);
            $this->assertEquals(3675, $address->getPageId(), "Row $i");
            $this->assertEquals('23', $address->getFoliation());

        }
    }
}
