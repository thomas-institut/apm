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

use APM\Core\Token\Token;
use APM\Core\Token\TokenType;
use APM\StandardData\TokenDataProvider;
use PHPUnit\Framework\TestCase;
use Swaggest\JsonSchema\Exception;
use Swaggest\JsonSchema\InvalidValue;
use Swaggest\JsonSchema\Schema;

class TokenDataProviderTest extends TestCase
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

        $testCases = [
            new Token(TokenType::WORD, 'someWord'),
            new Token(TokenType::WORD, 'someWord', 'normWord'),
            new Token(TokenType::WHITESPACE, ' '),
            new Token(TokenType::PUNCTUATION, '.')
        ];


        $schema = Schema::import($this->tokenSchemaUrl);

        foreach($testCases as $i => $token) {
            $exceptionRaised = false;
            $data = (new TokenDataProvider($token))->getStandardData();
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