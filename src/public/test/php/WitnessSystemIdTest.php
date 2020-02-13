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


namespace APM;


use APM\System\WitnessSystemId;
use PHPUnit\Framework\TestCase;

require "autoload.php";


class WitnessSystemIdTest extends TestCase
{

    public function testFullTxIds() {
        $this->assertEquals('AW47-100-fullTx-34-A-20091225145927000000',
            WitnessSystemId::buildFullTxId('AW47', 100, 34, 'A', '2009-12-25 14:59:27.000000'));
    }
}