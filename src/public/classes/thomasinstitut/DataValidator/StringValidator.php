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

namespace ThomasInstitut\DataValidator;


use Exception;
use InvalidArgumentException;
use RuntimeException;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

class StringValidator implements iDataValidator
{
    use SimpleErrorReporterTrait;

    const ERROR_REGEX_ERROR = 2001;
    const MUST_MATCH_REGEX_PATTERN = 2002;

    /**
     * @var bool
     */
    private $mustNotBeEmpty;
    /**
     * @var string
     */
    private $matchRegex;

    public function __construct(bool $mustNotBeEmpty = false, string $regex = '')
    {
        $this->resetError();
        $this->mustNotBeEmpty = $mustNotBeEmpty;
        if ($regex !== '') {
            try {
                $test = preg_match($regex, 'somestring');
            } catch (Exception $e) {
                throw new InvalidArgumentException("Invalid regex pattern: '$regex' : [" . preg_last_error() . '] ' . $e->getMessage(), self::ERROR_REGEX_ERROR);
            }

            if ($test === false) {
                // @codeCoverageIgnoreStart
                throw new RuntimeException("Regex match error with '$regex', preg error code =  " .
                    preg_last_error(), self::ERROR_REGEX_ERROR);
                // @codeCoverageIgnoreEnd
            }
        }
        $this->matchRegex = $regex;

    }

    public function isValid($data): bool
    {
        if (!is_string($data)) {
            $this->setError('Data must be a string', ValidationError::DATA_MUST_BE_STRING);
            return false;
        }

        if ($this->mustNotBeEmpty && $data === '') {
            $this->setError('Data must not be an empty string', ValidationError::DATA_MUST_NOT_BE_EMPTY);
            return false;
        }

        if ($this->matchRegex !== '') {
            $matchResult = preg_match($this->matchRegex, $data);
            if ($matchResult === false) {
                // @codeCoverageIgnoreStart
                throw new RuntimeException("Error matching regex pattern '$this->matchRegex' : " .
                    preg_last_error(), self::ERROR_REGEX_ERROR);
                // @codeCoverageIgnoreEnd
            }
            if ($matchResult === 0) {
                $this->setError("String must match regex pattern '$this->matchRegex'", self::MUST_MATCH_REGEX_PATTERN );
                return false;
            }
        }

        return true;
    }
}