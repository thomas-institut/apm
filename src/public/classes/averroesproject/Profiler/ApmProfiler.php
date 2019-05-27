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

namespace AverroesProject\Profiler;


use AverroesProject\Data\DataManager;
use Monolog\Logger;

/**
 * Simple profiler with database statistics
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApmProfiler extends Profiler {
    
    /**
     *
     * @var DataManager $db
     */
    private $db;
    
    public function __construct(string $name, DataManager $db) {
        $this->db = $db;
        parent::__construct($name);
    }
    
    public function start() : void 
    {
        parent::start();
        $this->db->queryStats->reset();
    }
    
    
    
    public function getData() : array
    {
        $data = parent::getData();
        $data['query-stats'] = $this->db->queryStats->info;
        return $data;
    }
    
    public function log(Logger $logger) : void
    {
        $totalTime = $this->getTotalTime();
        $data = $this->getData();
        $logger->debug("PROFILER $this->name finished in $totalTime ms", $data);
    }
    
}
