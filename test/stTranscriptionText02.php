<?php

/* 
 * Copyright (C) 2016 Universität zu Köln
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


require_once '../src/transcriptiontext.php';
require_once '../src/columnelement.php';
require_once '../src/params.php';
require_once '../src/config.cordoba.php';
require_once '../src/apdata.php';

$apd = new ApData($config, $params['tables']);

$tt = $apd->getTranscribedText(100, 'la', 21, 0);


//print_r($tt);

//print "The text is: " . $tt->getText() . "\n";

$lines = $apd->getColumnElements('BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1);

//print_r($lines);
print "Language: " . ColumnElementArray::getMainLanguage($lines) . "\n";


foreach($lines as $line){
    print $line->seq . ": " . $line->transcribedText->getText() . "\n";
}

print_r($lines);

