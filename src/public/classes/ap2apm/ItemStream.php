<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
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

namespace AverroesProjectToApm;

use AverroesProjectToApm\ItemInItemStream;

/**
 * An APM representation of an AP stream of items
 * 
 * An AP stream of items is basically an array of rows coming straight
 * from the database. The main purpose of this class is to couple this
 * raw data to the Witness abstractions in the new APM design.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemStream {
    
    /**
     *
     * @var array 
     */
    private $items;
    
    public function __construct(int $docId, array $itemSegments, string $defaultLang = 'la') {
        $this->items = [];
        $factory = new ItemStreamItemFactory($defaultLang);
        
        foreach($itemSegments as $itemRows){
            foreach ($itemRows as $row) {
                $address = new AddressInItemStream();
                $address->setFromItemStreamRow($docId, $row);
                $item = $factory->createItemFromRow($row);
                $this->items[] = new ItemInItemStream($address, $item);
            }
        }
    }
    
    public function getItems() : array {
        return $this->items;
    }
}
