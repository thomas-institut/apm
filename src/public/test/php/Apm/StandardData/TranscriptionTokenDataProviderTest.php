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

namespace APM\Test;

require "../../config.php";

use APM\Core\Address\IntRange;
use APM\Core\Address\Point;
use APM\Core\Address\PointRange;
use APM\Core\Token\Token;
use APM\Core\Token\TokenType;
use APM\Core\Token\TranscriptionToken;
use APM\StandardData\TokenDataProvider;
use APM\StandardData\TranscriptionTokenDataProvider;
use PHPUnit\Framework\TestCase;
use Swaggest\JsonSchema\Exception;
use Swaggest\JsonSchema\InvalidValue;
use Swaggest\JsonSchema\Schema;

class TranscriptionTokenDataProviderTest extends TestCase
{

    const SCHEMA = '/schema/json/token.json';

    /**
     * @var string
     */
    private $baseUrl;
    /**
     * @var string
     */
    private $tokenSchemaUrl;

    public function __construct($name = null, array $data = [], $dataName = '')
    {
        global $config;
        parent::__construct($name, $data, $dataName);

        $this->baseUrl = $config['baseurl'];

        $this->tokenSchemaUrl = $this->baseUrl . self::SCHEMA;
    }

    /**
     * @throws Exception
     * @throws InvalidValue
     */
    public function testValidation() {

        $testCases = [ ];

        $token = new TranscriptionToken(TokenType::WORD, "someWord");
        $token->setSourceItemIndexes([1]);
        $token->setSourceItemCharRanges( [ new IntRange(0,5)]);
        $startLine = new Point();
        $startLine->setCoord(0, 1);
        $startLine->setCoord(1, 3);
        $endLine = new Point();
        $endLine->setCoord(0, 1);
        $endLine->setCoord(1, 4);
        $token->setTextBoxLineRange(new PointRange($startLine, $endLine));

        $testCases[] = $token;


        $schema = Schema::import($this->tokenSchemaUrl);

        foreach($testCases as $i => $token) {
            $exceptionRaised = false;
            $data = (new TranscriptionTokenDataProvider($token))->getStandardData();
            //print_r($data);
            try {
                $schema->in($data);
            } catch (\Exception $e) {
                $exceptionRaised = true;
                print $e->getMessage();
            }
            $this->assertFalse($exceptionRaised, "Test case $i");
        }

    }
}