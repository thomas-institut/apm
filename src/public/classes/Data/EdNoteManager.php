<?php

/*
 *  Copyright (C) 2017 Universität zu Köln
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

namespace AverroesProject\Data;

use AverroesProject\EditorialNote;

/**
 * Manages editorial notes
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class EdNoteManager {
    
    private $dbh;
    private $tNames;
    private $logger;
            
    public function __construct($dbh, $tableNames, $logger) {
        
        $this->dbh = $dbh;
        $this->tNames = $tableNames;
        $this->logger = $logger;
    }
    
    function getEditorialNotesByTypeAndTarget($type, $target){
        $query = 'SELECT * FROM `' . $this->tNames['ednotes'] . 
                '` WHERE `type`=' . $type . ' AND ' . 
                '`target`=' . $target; 
        $rows = $this->dbh->getAllRows($query);
        return $this->editorialNoteArrayFromRows($rows);
    }
        
    function getEditorialNotesByDocPageCol($docId, $pageNum, $colNumber=1){
        $ted = $this->tNames['ednotes'];
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        
        $query = "SELECT `$ted`.* from `$ted` " . 
                "JOIN `$ti` on `$ted`.`target`=`$ti`.`id` " . 
                "JOIN `$te` on `$te`.`id`= `$ti`.`ce_id` " . 
                "JOIN `$tp` on `$tp`.`id`= `$te`.`page_id` " . 
                "WHERE `$tp`.`doc_id`=$docId and `$tp`.`page_number`=$pageNum "
                . "AND `$te`.`column_number`=$colNumber";
        
        $rows = $this->dbh->getAllRows($query);
        return $this->editorialNoteArrayFromRows($rows);
    }
    
    private function newEditorialNoteFromRow($row) {
        $en = new EditorialNote();
        $en->id = (int) $row['id'];
        $en->type = (int) $row['type'];
        $en->authorId = (int) $row['author_id'];
        $en->lang = $row['lang'];
        $en->target = (int) $row['target'];
        $en->time = $row['time'];
        $en->text = $row['text'];
        return $en;
    }
    
    private function editorialNoteArrayFromRows($rows) {
        $notes = [];
        foreach ($rows as $row) {
            $notes[]= $this->newEditorialNoteFromRow($row);
        }
        return $notes;
    }
}
