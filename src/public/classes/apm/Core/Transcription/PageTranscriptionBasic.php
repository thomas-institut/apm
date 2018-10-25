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

use APM\Core\Transcription\TextBox;

/**
 * No frills implementation of PageTranscription using 
 * arrays
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PageTranscriptionBasic extends PageTranscription {
    
    protected $textBoxes;
    
    public function __construct() {
        $this->textBoxes = [];
    }
    
    public function addTextBox(TextBox $tb) : int{
        $nextIndex = count($this->textBoxes);
        $this->textBoxes[] = $tb;
        return $nextIndex;
    }

    public function getTextBoxByIndex(int $index): TextBox {
        if (!isset($this->textBoxes[$index])) {
            throw new \OutOfBoundsException('Index is out of bounds');
        }
        return $this->textBoxes[$index];
    }

    public function getTextBoxCount(): int {
        return count($this->textBoxes);
    }


    /**
     * 
     * @param int $index
     * @param TextBox $tb
     * @throws \OutOfRangeException
     */
    public function replaceTextBox(int $index, TextBox $tb) {
        if ($index >= $this->getTextBoxCount()) {
            throw new \OutOfBoundsException('Index is out of bounds');
        }
        $this->textBoxes[$index] = $tb;
    }

    public function getTextBoxReference(int $index): ItemAddressInPage {
        if (!isset($this->textBoxes[$index])) {
            throw new \OutOfBoundsException('Index is out of bounds');
        }
        return $this->textBoxes[$index]->getReference();
    }

}
