<?php
/* 
 *  Copyright (C) 2019 Universität zu Köln
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

namespace ThomasInstitut;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataValidator\EmailAddressValidator;
use ThomasInstitut\DataValidator\NullValidator;
use ThomasInstitut\DataValidator\StringValidator;
use ThomasInstitut\DataValidator\ValidationError;

class DataValidatorTest extends TestCase
{

    public function testStringValidator() {

        $validator = new StringValidator();

        $noStrings = [ 1, 1.4, [], new NullValidator()];

        foreach($noStrings as $noStringData) {
            $this->assertFalse($validator->isValid($noStringData));
            $this->assertEquals(ValidationError::DATA_MUST_BE_STRING, $validator->getErrorCode());
        }

        $this->assertTrue($validator->isValid(''));

        $validator2 = new StringValidator(true);
        $this->assertFalse($validator2->isValid(''));
        $this->assertEquals(ValidationError::DATA_MUST_NOT_BE_EMPTY, $validator2->getErrorCode());

        $badRegexPatterns = ['asdf'];
        foreach ($badRegexPatterns as $badRegexPattern) {
            $exceptionCaught = false;
            try {
                new StringValidator(true, $badRegexPattern);
            } catch (InvalidArgumentException $e) {
                $exceptionCaught = true;
            }

            $this->assertTrue($exceptionCaught, "testing pattern '$badRegexPattern'");
        }

        $regexPattern = '/^test/';
        $validator3 = new StringValidator(true, $regexPattern);

        $badStrings = [ 'tes0', 'anything', 'tes t 20'];
        foreach($badStrings as $badString) {
            $this->assertFalse($validator3->isValid($badString));
            $this->assertEquals(StringValidator::MUST_MATCH_REGEX_PATTERN, $validator3->getErrorCode());
        }

    }

    public function testNullValidator() {
        $validator = new NullValidator();

        $dataItems = [ 1, 1.4, [], new NullValidator(),  'tes0', 'anything', 'tes t 20'];

        foreach ($dataItems as $data) {
            $this->assertTrue($validator->isValid($data));
        }
    }

    public function  testEmailValidator() {
        $validator = new EmailAddressValidator();

        $badDataItems = [ 1, 1.4, [], new NullValidator(),  'tes0', 'anything', 'tes t 20', 'test@mail', 'test.@mail.com', '@google.com'];

        foreach ($badDataItems as $data) {
            $this->assertFalse($validator->isValid($data));
            if (!is_string($data)) {
                $this->assertEquals(ValidationError::DATA_MUST_BE_STRING, $validator->getErrorCode());
            } else {
                $this->assertEquals(EmailAddressValidator::ERROR_MUST_BE_VALID_EMAIL_ADDRESS, $validator->getErrorCode());
            }
        }

        $goodEmailAdresses = [ 'test@gmail.com', 'john.doe@some.very.long.domain'];

        foreach($goodEmailAdresses as $adress) {
            $this->assertTrue($validator->isValid($adress));
        }

    }

}