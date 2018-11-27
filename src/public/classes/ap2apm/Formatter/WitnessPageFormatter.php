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

namespace AverroesProjectToApm\Formatter;

use APM\Core\Item\TextualItem;

/**
 * Description of WitnessPageFormatter
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class WitnessPageFormatter implements ItemFormatter {
    
    public function formatTextualItem(TextualItem $item): string {
        
        $classes = [];
        $classes[] = 'textualitem';
        
        if ($item->getFormat() !== TextualItem::FORMAT_NONE) {
            $classes[] = $item->getFormat();
        }
        $text = $item->getNormalizedText();
        if ($item->getNormalizationType() !== TextualItem::NORMALIZATION_NONE) {
            $classes[] = $item->getNormalizationType();
        }
        
        $html = '<span class="' . implode(' ', $classes) . '">' . $text . '</span>';
        return $html;
    }

}
