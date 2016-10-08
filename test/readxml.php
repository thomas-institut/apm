<?php

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

if (isset($argv[1])){
    $filename = $argv[1];
}
else {
    die("Please give a filename to load.\n");
}

$types = ['None', 'Element', 'Attribute', 'Text', 'Cdata',  'EntityRef',  'Entity', 'PI', 'Comment', 'Doc', 'DocType', 'DocFragment', 'Notation', 'Whitespace', 'SigWS', 'EndElem', 'EndEntity'];
$reader = new XMLReader();
$reader->open($filename);

while ($reader->read()){
    
    print "Type: " . $types[$reader->nodeType] .  "\tDepth: " . $reader->depth . "  Name: " . $reader->name . "\n";
}