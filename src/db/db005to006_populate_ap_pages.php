<?php

/* 
 *  Copyright (C) 2016 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

//
// Generates an SQL program to populate entries in the ap_pages table 
// for all documents in ap_docs
require_once 'public/config.php';

$dbh = new \PDO('mysql:dbname='. $config['db']['db'] . ';host=' . $config['db']['host'], 
        $config['db']['user'], 
        $config['db']['pwd']);
$dbh->query("set character set 'utf8'");
$dbh->query("set names 'utf8'");


$r = $dbh->query('SELECT * FROM ' . $config['tables']['docs']);

$id = 1;
while ($doc = $r->fetch(PDO::FETCH_ASSOC)){
    print "-- Processing doc id " . $doc['id'] . "--\n";
    print "INSERT INTO " . $config['tables']['pages'] . " (`id`, `page_number`, `doc_id`, `type`, `lang`) VALUES \n";
    $pages = array();
    for ($i = 1; $i <= $doc['page_count']; $i++ ){
        $pages[] = "   ("  . 
                implode(',', [ 
                    $id,
                    $i, 
                    $doc['id'],
                    '0',
                    "'" . $doc['lang'] . "'"
                ])
                
                . ")";
        $id++;
    }
    print implode(",\n", $pages);
    print ";\n";
}
        
