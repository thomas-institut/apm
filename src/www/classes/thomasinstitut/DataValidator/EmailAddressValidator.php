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

use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

/**
 * Class EmailAddressValidator
 * Checks whether an email address is valid
 *
 * @package ThomasInstitut\DataValidator
 */
class EmailAddressValidator implements dataValidator
{
    use SimpleErrorReporterTrait;
    const ERROR_MUST_BE_VALID_EMAIL_ADDRESS = 501;

    public function __construct()
    {
        $this->resetError();
    }

    public function isValid($data): bool
    {

        $stringValidator = new StringValidator(false);

        if (!$stringValidator->isValid($data)) {
            $this->setError($stringValidator->getErrorMessage(), $stringValidator->getErrorCode());
            return false;
        }

        if (filter_var($data, FILTER_VALIDATE_EMAIL) !== false) {
            return true;
        }

        $this->setError("Invalid email address", self::ERROR_MUST_BE_VALID_EMAIL_ADDRESS);
        return false;
    }
}