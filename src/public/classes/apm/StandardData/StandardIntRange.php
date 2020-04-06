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


class StandardIntRange
{
    public static function getStandardIntRange(int $from, int $to) {
        if ($from === $to) {
            return $from;
        }
        return (object) [ 'from' => $from, 'to' => $to];
    }

    public static function getStandardIntRangeWithLength(int $from, int $to, int $length) {
        $data = (object) [ 'from' => $from, 'to' => $to];
        if ($length !== ($to - $from + 1)) {
            $data->length = $length;
        }
        return $data;
    }

}