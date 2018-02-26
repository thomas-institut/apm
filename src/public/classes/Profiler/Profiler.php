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

namespace AverroesProject\Profiler;


/**
 * Simple profiler 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Profiler {
    
    /**
     * Constants for the $startNow parameter in the constructor
     */
    const START_NOW = true;
    const START_LATER = false;
    
    /*
     * @var string $name
     */
    public $name;
    
    /**
     *
     * @var array $laps
     */
    private $laps;
    
    public function __construct(string $name, $whenToStart = self::START_NOW) {
        $this->name = $name;
        if ($whenToStart === self::START_NOW) {
            $this->start();
        }
    }
    
    public function lap(string $lapName) : void
    {
        $this->laps[] = [ 'name' => $lapName, 'time' => microtime(true)];
    }
    
    public function stop() : void
    {
        if (count($this->laps) > 0) {
            // the profiler has started, so let's finish it
            $this->lap('Finish');
        }
    }
    
    public function start() : void 
    {
        $this->laps = [];
        $this->lap('Start');
    }
    
    
    private function calcDuration($t2, $t1) : float
    {
        return round(($t2-$t1)*1000, 3);
    }
    
    private function getLaps() : array
    {
        $nLaps = count($this->laps);
        if ($nLaps === 0) {
            return [];
        }
        if ($nLaps === 1 || $this->laps[$nLaps-1]['name'] !== 'Finish') {
            $this->stop();
            $nLaps++;
        }
        
        $calculatedLaps = [];
        for($i = 1; $i<$nLaps; $i++) {
            $calculatedLaps[] = [ 
                $this->laps[$i-1]['name'], 
                $this->laps[$i]['name'],
                $this->calcDuration($this->laps[$i]['time'],$this->laps[$i-1]['time'])
              ];
        }
        if ($nLaps > 2) {
            $calculatedLaps[] = [ 
                $this->laps[0]['name'], 
                $this->laps[$nLaps-1]['name'],
                $this->calcDuration($this->laps[$nLaps-1]['time'],$this->laps[0]['time'])
              ];
        }
        return $calculatedLaps;
        
    }
    
    public function getData() : array
    {
        return [ 
            'name' => $this->name,
            'laps' => $this->getLaps()
        ];
    }
    
    
    public function getTotalTime() : float
    {
        $data = $this->getData();
        return $data['laps'][count($data['laps'])-1][2];
    }

}
