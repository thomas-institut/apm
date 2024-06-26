<?php


namespace APM\ToolBox;

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

use InvalidArgumentException;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;


/**
 * Utility class to check that an array structure has the proper elements
 * and types of elements
 */
class ArrayChecker implements ErrorReporter
{
    use SimpleErrorReporterTrait;

    const ERROR_NO_ERROR = 0;
    const ERROR_MISSING_REQUIRED_FIELD = 101;
    const ERROR_WRONG_FIELD_TYPE = 102;

    const RULE_REQUIRED_FIELDS = 'requiredFields';

    public function __construct()
    {
        $this->resetError();
    }

    /**
     * Determines whether the given $input array is valid according to the
     * given $rules
     *
     * The $rules array can contain the following fields:
     *
     *   RULE_REQUIRED_FIELDS : one element for each field that must exist
     *     in the $input array. Each element contains the name of the required field,
     *     optionally a required type or class and further check rules
     *       [ 'name' => 'someFieldName',
     *         <'requiredType' => 'string'|'bool'|'int'|'float'|'array'|'someClassName'>
     *         <'arrayRules' => some array of rules >
     *      ]
     *
     * @param array $input
     * @param array $rules
     * @return bool
     */
    public function isArrayValid(array $input, array $rules) : bool {
        $this->resetError();
        if (isset($rules[self::RULE_REQUIRED_FIELDS])) {
            if (!is_array($rules[self::RULE_REQUIRED_FIELDS])) {
                throw new InvalidArgumentException('requiredFields rule must be an array');
            }
            foreach($rules[self::RULE_REQUIRED_FIELDS] as $requiredFieldSpec) {
                if (!is_string($requiredFieldSpec) && !isset($requiredFieldSpec['name'])) {
                    throw new InvalidArgumentException("Required field must either be a string or an array with a 'name' field");
                }
                //$requiredFieldName = '';
                if (is_string($requiredFieldSpec)) {
                    $requiredFieldName = $requiredFieldSpec;
                } else {
                    /** @var array $requiredFieldSpec*/
                    $requiredFieldName = $requiredFieldSpec['name'];
                }

                if (!isset($input[$requiredFieldName])) {
                    $this->setError("Missing required field '" . $requiredFieldName . "'",
                        self::ERROR_MISSING_REQUIRED_FIELD);
                    return false;
                }
                $theField = $input[$requiredFieldName];
                if (isset($requiredFieldSpec['requiredType'])) {
                    switch($requiredFieldSpec['requiredType']) {
                        case 'string':
                            if (!is_string($theField)) {
                                $this->setError("Field '" . $requiredFieldName . "' must be a string, got a " .
                                    gettype($theField), self::ERROR_WRONG_FIELD_TYPE);
                                return false;
                            }
                            break;

                        case 'integer':
                        case 'int':
                            if (!is_integer($theField)) {
                                $this->setError("Field '" . $requiredFieldName . "' must be an integer, got a " .
                                    gettype($theField), self::ERROR_WRONG_FIELD_TYPE);
                                return false;
                            }
                            break;

                        case 'bool':
                        case 'boolean':
                            if (!is_bool($theField)) {
                                $this->setError("Field '" . $requiredFieldName . "' must be a boolean, got a " .
                                    gettype($theField), self::ERROR_WRONG_FIELD_TYPE);
                                return false;
                            }
                            break;

                        case 'double':
                        case 'float':
                            if (!is_float($theField)) {
                                $this->setError('Field \'' . $requiredFieldName . '\' must be a float, got a ' .
                                    gettype($theField), self::ERROR_WRONG_FIELD_TYPE);
                                return false;
                            }
                            break;

                        case 'array':
                            if (!is_array($theField)) {
                                $this->setError('Field \'' . $requiredFieldName . '\' must be an array, got a ' .
                                    gettype($theField), self::ERROR_WRONG_FIELD_TYPE);
                                return false;
                            }
                            if (isset($requiredFieldSpec['arrayRules'])) {
                                $checker = new ArrayChecker();
                                $isValid = $checker->isArrayValid($theField, $requiredFieldSpec['arrayRules']);
                                if (!$isValid) {
                                    $this->setError($requiredFieldName . ': ' . $checker->getErrorMessage(),
                                        $checker->getErrorCode());
                                    return false;
                                }
                            }
                            break;
                    }
                }
            }
        }
        return true;
    }
}