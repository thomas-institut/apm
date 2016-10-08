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


$tt = new TranscriptionText();

$tt->addItem(new TtiText(1, -1, "This is some text"));
$tt->addItem(new TtiText(2, -1, " and this is more text "));
$tt->addItem(new TtiIllegible(3, -1, 5));
$tt->addItem(new TtiText(4, -1, " and some more text"));
$tt->setLanguageOnAllItems();
$tt->setHandOnAllItems();

print_r($tt);

print "The text is: " . $tt->getText() . "\n";


