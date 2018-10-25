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
 * PageTranscription object factory
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PageTranscriptionFactory {
    
    public function createPageTranscriptionFromColumnTextArray($lang, $hand, array $cols) : PageTranscriptionBasic {
        $pt = new PageTranscriptionBasic();
        $tbf = new TextBoxFactory();
        $tboxes = $tbf->createTextBoxesFromColumnTextArray($lang, $hand, $cols);
        foreach($tboxes as $tb) {
            $pt->addTextBox($tb);
        }
        return $pt;
    }
    
    public function createPageTranscriptionFromColumnItemArray(array $cols) : PageTranscriptionBasic {
        $pt = new PageTranscriptionBasic();
        $tbf = new TextBoxFactory();
        $colNum = 1;
        foreach($cols as $colItemArray) {
            $tb = $tbf->createColumn($colNum, $colItemArray);
            $pt->addTextBox($tb);
        }
        return $pt;
    }
}
