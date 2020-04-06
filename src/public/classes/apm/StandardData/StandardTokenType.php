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

namespace APM\StandardData;


use APM\Core\Token\TokenType;

class StandardTokenType
{
    const WORD = 'word';
    const WHITESPACE = 'whitespace';
    const PUNCTUATION = 'punctuation';

    const UNDEFINED = '';

    static public function getStandardTypeFromDbType(int $dbTokenType) {
        switch($dbTokenType) {
            case TokenType::WORD:
                return self::WORD;
            case TokenType::WHITESPACE:
                return self::WHITESPACE;
            case TokenType::PUNCTUATION:
                return self::PUNCTUATION;
            default:
                return self::UNDEFINED;
        }
    }
}