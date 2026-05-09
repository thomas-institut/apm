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

namespace ThomasInstitut\CodeDebug;

/**
 * Interface CodeDebugInterface
 *
 * @package ThomasInstitut\CodeDebug
 */
interface CodeDebugInterface
{
    /**
     * Logs a debug message with the given message and data, including
     * source file and line information.
     *
     * Only the last $fileNameDepth parts of the source file name must be logged
     * (e.g., if the file name is /usr/share/myapp/classes/Package/SubPackage/MyClass.php
     * and $fileNameDepth === 3, the file name must be reported as
     *   Package/SubPackage/MyClass.php
     * @param string $msg
     * @param array $data
     * @param $fileNameDepth
     * @return void
     */
    public function codeDebug(string $msg, array $data, $fileNameDepth) : void;
}