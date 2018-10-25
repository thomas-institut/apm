<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
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
