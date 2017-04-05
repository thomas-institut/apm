<?php

/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace AverroesProject\Algorithm;

/**
 * Utility Methods
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Utility {
    
    public static function arraySortByKey(&$rows, $key) 
    {
        usort(
            $rows, 
            function ($a, $b) use($key) {
                if (is_object($a)) {
                    $a = (array) $a;
                    $b = (array) $b;
                }
                return $a[$key] < $b[$key] ? -1 : 1;
            }
        );    
    }
}
