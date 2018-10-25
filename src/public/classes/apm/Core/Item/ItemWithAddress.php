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

namespace APM\Core\Item;

use APM\Core\Address\Address;

/**
 * An Item decorated with an Address
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemWithAddress {
    protected $address;
    protected $theItem;
    
    public function __construct(Address $address, Item $item) {
        $this->address = $address;
        $this->theItem = $item;
    }
    
    public function getItem() : Item {
        return $this->theItem;
    }
    
    public function getAddress() : Address {
        return $this->address;
    }
}
