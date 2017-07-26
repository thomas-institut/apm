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

namespace AverroesProject\TxText;


/**
 * Description of CharacterGap
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class CharacterGap extends Item
{
    /**
     * 
     * @param int $id
     * @param int $s
     */
    public function __construct($id, $s, $l = 1)
    {
        parent::__construct($id, $s);
        $this->type = parent::CHARACTER_GAP;
        $this->setLength($l);
    }
    
    public function getText()
    {
        $spaceCharacter = ' ';
        $str = '';
        for ($i = 0; $i < $this->length; $i++) {
            $str .= $spaceCharacter;
        }
        return $str;
    }
    
    public function setLength(int $l) 
    {
        $this->length = $l;
    }
}
