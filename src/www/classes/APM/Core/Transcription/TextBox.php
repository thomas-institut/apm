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

use APM\Core\Item\Item;
use InvalidArgumentException;

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
 * and left folia also with marginalia, and so on. This class does not enforce a
 * particular set of valid text box types or placements. It is recommended to use a factory class to
 * create a consistent set of TextBox objects
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TextBox {

    const int ERROR_INVALID_TYPE = 1001;
    const int ERROR_INVALID_ITEM_ARRAY = 1002;

    protected string $placement;
    protected array $items;
    protected string $type;
    protected ItemAddressInPage $reference;
    protected bool $mainTextFlag;

    public function getPlacement() : string {
        return $this->placement;
    }
    
    public function setPlacement(string $p): void
    {
        $this->placement = $p;
    }

    /**
     * TextBox constructor.
     *
     * @param string $type
     * @param string $placement
     * @param bool $isMainText
     * @param ItemAddressInPage|null $reference
     * @param array $theItems
     */
    public function __construct(string $type, string $placement, 
            bool $isMainText, ?ItemAddressInPage $reference,
                                array $theItems) {
        $this->setPlacement($placement);
        $this->setType($type);
        $this->setReference(ItemAddressInPage::NullAddress());
        if (!is_null($reference)) {
            $this->setReference($reference);
        }
        $this->mainTextFlag = $isMainText;
        $this->setItems($theItems);

    }

    /**
     * Sets the TextBox's type
     *
     * @param string $type
     * @throws InvalidArgumentException
     */
    public function setType(string $type): void
    {
        if ($type === '') {
            throw new InvalidArgumentException('TextBox type cannot be an empty string', self::ERROR_INVALID_TYPE);
        }
        $this->type = $type;
    }

    /**
     * @return string
     */
    public function getType(): string
    {
        return $this->type;
    }

    /**
     * @return ItemAddressInPage
     */
    public function getReference() : ItemAddressInPage {
        return $this->reference;
    }

    /**
     * @param ItemAddressInPage $address
     */
    public function setReference(ItemAddressInPage $address): void
    {
        $this->reference = $address;
    }

    /**
     * Returns the TextBox's "raw" items (without address)
     *
     * @return Item[]
     */
    public function getItems() : array {
        return $this->items;
    }

    /**
     * Sets the TextBox's items
     *
     * @param Item[] $items
     * @throws InvalidArgumentException  if there's a non-Item element in the given array
     */
    public function setItems(array $items): void
    {
        foreach ($items as $item) {
            if (!is_a($item, Item::class )) {
                throw new InvalidArgumentException('Trying to set text box items with non Item object', self::ERROR_INVALID_ITEM_ARRAY);
            }
        }
        $this->items = $items;
    }

    /**
     * @return bool
     */
    public function isMainText() : bool {
        return $this->mainTextFlag;
    }

    /**
     * Sets the TextBox as main text
     */
    public function setAsMainText() : void {
        $this->mainTextFlag = true;
    }
    
    public function setAsNotMainText() : void {
        $this->mainTextFlag = false;
    }
}
    