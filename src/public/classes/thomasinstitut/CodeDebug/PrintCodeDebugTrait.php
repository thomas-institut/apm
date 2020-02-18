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


trait PrintCodeDebugTrait
{
    private $debugMode = false;

    public function codeDebug(string $msg, array $data = [], $fileNameDepth = 3) {
        if (!$this->debugMode) {
            return;
        }
        $backTrace = debug_backtrace();
        $caller = array_shift($backTrace);
        $sourceCodeFilename = $caller['file'];
        if ($fileNameDepth > 0) {
            $parts = explode('/', $sourceCodeFilename);
            if (count($parts) > $fileNameDepth) {
                $goodParts = array_slice($parts,count($parts)-$fileNameDepth, $fileNameDepth);
                $sourceCodeFilename = implode('/', $goodParts);
            }
        }
        $line = $caller['line'];

        print "CODE $msg  [$sourceCodeFilename:$line]\n";
        if ($data !== []) {
            print_r($data);
            print "---------\n";
        }
    }

}