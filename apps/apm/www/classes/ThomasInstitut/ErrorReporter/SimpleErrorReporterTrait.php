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

namespace ThomasInstitut\ErrorReporter;


use InvalidArgumentException;
use RuntimeException;

trait SimpleErrorReporterTrait
{
    /**
     *
     * @var string
     */
    private string $errorMessage;

    /**
     *
     * @var int
     */
    private int $errorCode;

    /**
     * @param string $message
     * @param int $code
     */
    protected function setError(string $message, int $code) : void
    {
        $this->errorMessage = $message;
        $this->errorCode = $code;
    }

    protected function resetError() : void {
        $this->setError('', 0);
    }

    /**
     * Returns a string describing the last error
     *
     * @return string
     */
    public function getErrorMessage() : string
    {
        return $this->errorMessage;
    }


    /**
     * @return int
     */
    public function getErrorCode() : int
    {
        return $this->errorCode;
    }

    /**
     * Convenience method to throw an InvalidArgument Exception
     * @param string $message
     * @param int $code
     */
    protected function throwInvalidArgumentException(string $message, int $code) : void {
        $this->setError($message, $code);
        throw new InvalidArgumentException($message, $code);
    }

    /**
     * Convenience method to throw an RunTime Exception
     * @param string $message
     * @param int $code
     */
    protected function throwRunTimeException(string $message, int $code) : void {
        $this->setError($message, $code);
        throw new RuntimeException($message, $code);
    }

}