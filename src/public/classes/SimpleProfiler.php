<?php

/*
 *  Copyright (C) 2016 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject;

/**
 * SimpleProfiler class
 * 
 * Adapted from http://stackoverflow.com/questions/21133/simplest-way-to-profile-a-php-script
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SimpleProfiler {
    
    private $timingPoints = [];
        
    /**
     * 
     * @param string $description  a descriptive string
     * @param int $iterations number of iterations or actions done
     */
    public function timingPoint($description, $iterations = 1)
    {
        array_push($this->timingPoints, ['name' => $description, 'time'=> microtime(true), 'n'=> $iterations]);

    }

    public function start(){
        $this->timingPoint('Start');
    }
    
    public function getReport()
    {
        
        $size = count($this->timingPoints);
        $s = "\n";

        for( $i=1; $i < $size; $i++)
        {
            $lapTime = $this->timingPoints[$i]['time'] - $this->timingPoints[$i-1]['time'];
            $iterationTime = $lapTime / $this->timingPoints[$i]['n'];
            $s .= "[" . $this->timingPoints[$i]['name'] . "]\n";
            $s .= sprintf("   %f secs", $lapTime);
            if ($this->timingPoints[$i]['n'] > 1){
                $s .= sprintf(" (%d x %f secs)", 
                        $this->timingPoints[$i]['n'], 
                        $iterationTime);
            }
            $s .= "\n";
        }
       return $s;
    }
    
}
