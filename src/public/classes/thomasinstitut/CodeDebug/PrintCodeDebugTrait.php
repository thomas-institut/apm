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
 * @codeCoverageIgnore
 */
trait PrintCodeDebugTrait
{
    private $debugMode = false;

    public function codeDebug(string $msg, array $data = [], $fileNameDepth = 3) : void  {
        if (!$this->debugMode) {
            return;
        }
        $backTraceData = CodeDebug::getBackTraceData($fileNameDepth);
        $sourceCodeFilename = $backTraceData['sourceCodeFilename'];
        $line = $backTraceData['line'];

        print "CODE $msg  [$sourceCodeFilename:$line]\n";
        if ($data !== []) {
            print_r($data);
            print "---------\n";
        }
    }

}