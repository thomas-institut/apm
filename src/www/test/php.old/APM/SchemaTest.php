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

namespace Test\APM;


use Exception;
use PHPUnit\Framework\TestCase;
use Swaggest\JsonSchema\InvalidValue;
use Swaggest\JsonSchema\Schema;

class SchemaTest extends TestCase
{
    /**
     * @var string
     */
    private $baseUrl;

    public function __construct($name = null, array $data = [], $dataName = '')
    {
        global $config;
        parent::__construct($name, $data, $dataName);

        $this->baseUrl = $config['baseurl'];
    }

    public function testSimple() {

        $schemataToLoad = [
            'witness' => [
                'url' => $this->baseUrl . "/schema/json/witness.json",
                'goodJson' => '{"chunkId":"AW20-1","witnessType":"fullTx","tokens":[]}',
                'badJson' => '{"other":"fullTx","tokens":[]}'
            ],
            'collationTable' => [
                'url' => $this->baseUrl . "/schema/json/collation_table.json",
                'goodJson' => '{"witnesses":[{"chunkId":"AW20-1","witnessType":"fullTx","tokens":[]},{"chunkId":"AW20-1","witnessType":"fullTx","tokens":[]}], "collationMatrix":[[],[]]}',
                'badJson' => '{"other":"fullTx","tokens":[]}'
            ]
        ];

        $schemata = [];
        foreach ($schemataToLoad as $name => $schemaInfo) {
            $invalidValueExceptionCaught = false;
            $exceptionCaught = false;
            try {
                $schema = Schema::import($schemaInfo['url']);
            } catch (InvalidValue $e) {
                $invalidValueExceptionCaught = true;
            } catch (Exception $e) {
                $exceptionCaught = true;
                print "Exception: " . $e->getMessage() . "\n";
            }
            $this->assertFalse($invalidValueExceptionCaught, "Loading schema '$name'");
            $this->assertFalse($exceptionCaught, "Loading schema '$name'");

            $exceptionCaught = false;
            try {
                $schema->in(json_decode($schemaInfo['goodJson']));
            } catch (Exception $e) {
                $exceptionCaught = true;
                print "Exception: " . $e->getMessage() . "\n";
            }
            $this->assertFalse($exceptionCaught, "Good Json '$name'");

            $exceptionCaught = false;
            try {
                $schema->in(json_decode($schemaInfo['badJson']));
            } catch (Exception $e) {
                $exceptionCaught = true;
            }
            $this->assertTrue($exceptionCaught, "Bad Json '$name'");
            $schemata[$name] = $schema;
        }

    }

}