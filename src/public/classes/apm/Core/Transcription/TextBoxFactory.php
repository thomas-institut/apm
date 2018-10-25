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

namespace APM\Core\Transcription;

/**
 * Factory of set types of text box 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TextBoxFactory {
    
    public function createColumn(string $id, array $items = []) : TextBox {
        return new TextBox('column', 'column-' . $id , true, ItemAddressInPage::NullAddress(), $items);
    }
    
    public function createMarginalAddition(string $placement, ItemAddressInPage $ref, array $items = []) : TextBox {
        return new TextBox('addition', $placement, true, $ref, $items);
    }
    
    public function createMarginalGloss(string $placement, ItemAddressInPage $ref, array $items = []) : TextBox {
        return new TextBox('gloss', $placement, false, $ref, $items);
    }

    public function createTextBoxesFromColumnTextArray(string $lang, int $hand, array $cols) : array {
        $textBoxes = [];
        $colNumber = 1;
        $if = new \APM\Core\Item\ItemFactory($lang, $hand);
        foreach($cols as $col) {
            $items = [];
            foreach($col as $text) {
                $items[] = $if->createPlainTextItem($text);
            }
            $textBoxes[] = $this->createColumn($colNumber, $items);
            $colNumber++;
        }
        return $textBoxes;
    }

}
