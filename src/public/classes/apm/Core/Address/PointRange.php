<?php

/*
 * Copyright (C) 2018 Universität zu Köln
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

namespace APM\Core\Address;

/**
 * A range between two points.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PointRange implements Range {
    
    /** @var Point */
    protected $start;
    
    /** @var Point */
    protected $end;
    
    public function __construct($start, $end) {
        $pointClass = get_class(new Point());
        
        if (!is_a($start, $pointClass) && !is_array($start)) {
            throw new \InvalidArgumentException('First argument must be Point or array');
        }
        
        if (!is_a($end, $pointClass) && !is_array($end)) {
            throw new \InvalidArgumentException('Second argument must be Point or array');
        }
        $this->start = $start;
        if (is_array($start)) {
            $this->start = new Point($start);
        }
        
        $this->end = $end;
        if (is_array($end)) {
            $this->end = new Point($end);
        }
        
        if ($this->start->getDimensionCount() !== $this->end->getDimensionCount()){
            throw  new \InvalidArgumentException('Given points must have the same number of dimensions');
        }
    }
    
    public function getStart() {
        return $this->start;
    }
    
    public function getEnd() {
        return $this->end;
    }
    
    public function getLength() {
        return $this->start->distanceTo($this->end);
    }

}
