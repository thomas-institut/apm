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
 * Description of TtiMark
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class MarginalMark extends Item {
    /**
     * 
     * @param int $id
     * @param int $s
     */
    function __construct($id, $s,  $theText) {
        parent::__construct($id, $s);
        $this->type = parent::MARGINAL_MARK;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("MARGINAL_MARK items need non-empty text");
        }
        $this->theText = $theText;
    }
    
    function getText(){
        return '';
    }

}