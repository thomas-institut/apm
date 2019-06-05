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

namespace APM\Core\Transcription;

/**
 * TextBox is the basic unit of transcription. It consists essentially of 
 * an ordered set of textual items plus some metadata: 
 *   - textual type: main text, addition, gloss, ...
 *   - placement
 *   - (optionally) a reference to an item or another text box 
 * 
 * 
 * This class can be used to instantiate a wide variety of page schemes. For 
 * example, a page can be construed as having columns and marginalia, or as having right
 * and left folia also with marginalia, and so on. 
 * It is better to use a factory class to create a consistent set of TextBox
 * objects
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TextBox {

    /** @var string */
    protected $placement;
    
    /** @var array */
    protected $items;
   
    /** @var string */
    protected $type;
    
    /** @var ItemAddressInPage */
    protected $reference;
    
    /** @var bool */
    protected $mainTextFlag;
    
    public function getPlacement() : string {
        return $this->placement;
    }
    
    public function setPlacement(string $p){
        $this->placement = $p;
    }
    
    public function __construct(string $type, string $placement, 
            bool $isMainText = true, ItemAddressInPage $address = null, 
            array $theItems = []) {
        $this->setPlacement($placement);
        $this->setType($type);
        $this->setReference(ItemAddressInPage::NullAddress());
        if (!is_null($address)) {
            $this->setReference($address);
        }
        $this->mainTextFlag = $isMainText;
        $this->setItems($theItems);
    }
    
     public function setType(string $type) {
        $this->type = $type;
    }
    
    public function getType() {
        return $this->type;
    }
    
    public function getReference() : ItemAddressInPage {
        return $this->reference;
    }
    
    public function setReference(ItemAddressInPage $address) {
        $this->reference = $address;
    }
    
    public function getItems() {
        return $this->items;
    }
    
    
    public function setItems(array $items) {
        foreach ($items as $item) {
            if (!is_a($item, 'APM\Core\Item\Item' )) {
                throw new \InvalidArgumentException('Trying to set text box items with non Item object');
            }
        }
        $this->items = $items;
    }
    
    public function isMainText() {
        return $this->mainTextFlag;
    }
    
    public function setAsMainText() {
        $this->mainTextFlag = true;
    }
    
    public function setAsNotMainText() {
        $this->mainTextFlag = false;
    }
}
    