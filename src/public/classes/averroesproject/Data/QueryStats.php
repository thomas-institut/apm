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

namespace AverroesProject\Data;

/**
 * Simple stats for MySqlQueries
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class QueryStats {
    
    public $info;
    public $totalInfo;
    
    public function __construct() {
       $this->totalInfo = [ 'total' => 0];
       $this->reset();
    }
    
    public function reset() 
    {
        $this->info = [ 'total' => 0];
    }
    
    public function countQuery($type) 
    {
        if ($type === 'total') {
            return false;
        }
        if (!isset($this->info[$type])) {
            $this->info[$type] = 0;
            $this->totalInfo[$type] = 0;
        }
        
        $this->info[$type]++;
        $this->totalInfo[$type]++;
        $this->info['total']++;
        $this->totalInfo['total']++;
        return true;
    }
    
}
