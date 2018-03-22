<?php

/*
 *  Copyright (C) 2018 Universität zu Köln
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
require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
use AverroesProject\Profiler\Profiler;

/**
 * Description of TranscriptionReaderTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ProfilerTest extends TestCase {
     
    
    public function testProfilerSimple()
    {
        
        $profilerName = 'TestProfiler';
        $profiler = new Profiler($profilerName, Profiler::START_LATER);
        
        $data1 = $profiler->getData();
        $this->assertCount(0, $data1['laps']);
        $this->assertEquals($profilerName, $data1['name']);
        
        $profiler->stop();
        $data2 = $profiler->getData();
        $this->assertCount(0, $data2['laps']);
        
        $profiler->start();
        $data3 = $profiler->getData(); // implied stop 
        $this->assertCount(1, $data3['laps']);
        
    }
    
    public function testProfilerWithLaps()
    {
        $profilerName = 'TestProfiler';
        $profiler = new Profiler($profilerName, Profiler::START_NOW); 
        
        $profiler->lap('Mid lap');
        $profiler->stop();
        
        $data = $profiler->getData();
        $this->assertCount(3, $data['laps']);
        $this->assertEquals($data['laps'][2][2], $profiler->getTotalTime());
    }
    
}
