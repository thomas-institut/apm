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
use DataTable\MySqlDataTable;

/**
 * Manages editorial notes
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class EdNoteManager {
    
    private $dbh;
    private $tNames;
    private $logger;
    private $edNotesDataTable;
            
    public function __construct($dbConn, $dbh, $tableNames, \Monolog\Logger $logger) 
    {
        $this->dbh = $dbh;
        $this->tNames = $tableNames;
        $this->logger = $logger;
        $this->edNotesDataTable = new MySqlDataTable($dbConn, 
                $tableNames['ednotes']);
        
        if ($this->edNotesDataTable === false) {
            $this->logger->error('Cannot construct EdNotes data table');
        }
    }
    
    public function getEditorialNotesByTypeAndTarget($type, $target){
        
//        $query = 'SELECT * FROM `' . $this->tNames['ednotes'] . 
//                '` WHERE `type`=' . $type . ' AND ' . 
//                '`target`=' . $target; 
        //$rows = $this->dbh->getAllRows($query);
        $rows = $this->edNotesDataTable->findRows(['type' => $type,
            'target' => $target]);
        return self::editorialNoteArrayFromRows($rows);
    }
        
    public function getEditorialNotesByDocPageCol($docId, $pageNum, $colNumber=1){
        $ted = $this->tNames['ednotes'];
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        
        $query = "SELECT `$ted`.* from `$ted` " . 
                "JOIN `$ti` on `$ted`.`target`=`$ti`.`id` " . 
                "JOIN `$te` on `$te`.`id`= `$ti`.`ce_id` " . 
                "JOIN `$tp` on `$tp`.`id`= `$te`.`page_id` " . 
                "WHERE `$tp`.`doc_id`=$docId and `$tp`.`page_number`=$pageNum " . 
                "AND `$te`.`column_number`=$colNumber " . 
                "AND `$te`.`valid_until`='9999-12-31 23:59:59.999999' " .
                "AND `$tp`.`valid_until`='9999-12-31 23:59:59.999999' " .
                "AND `$ti`.`valid_until`='9999-12-31 23:59:59.999999'";
        
        $rows = $this->dbh->getAllRows($query);
        return self::editorialNoteArrayFromRows($rows);
    }
    
    /**
     * Inserts a new note for item $target
     * The item and the authorId must exist in the DB, they are not checked
     * 
     * @param type $target
     * @param type $authorId
     * @param type $text
     */
    public function insertInlineNote($target, $authorId, $text ) {
        return $this->insertNote(EditorialNote::INLINE, $target, $authorId, $text);
    }
    
    public function insertNote($type, $target, $authorId, $text) {
        return $this->edNotesDataTable->createRow([
            'type' => $type,
            'target' => $target,
            'lang' => 'en',
            'author_id' => $authorId,
            'text' => $text
        ]);
    }
    
    public function updateNote($note) {
        return $this->edNotesDataTable->updateRow([
            'id' => $note->id,
            'type' => $note->type,
            'lang' => 'en',
            'author_id' => $note->authorId,
            'text' => $note->text,
            'target' => $note->target
                ]);
    }
    
    public function updateNotesFromArray(array $edNotes) {
        // First, group the notes by target and type
        $theNotes = [];
        $theNotes[EditorialNote::OFFLINE] = [];
        $theNotes[EditorialNote::INLINE] = [];
        foreach ($edNotes as $edNote) {
            if (!isset($theNotes[$edNote->type])) {
                $this->logger->error('Bad ed note type while updating notes from array', $edNote);
                continue;
            }
            $theNotes[$edNote->type][$edNote->target][] = $edNote;
        }
        
        // Now process each type
        foreach ($theNotes as $type => $notesForType) {
            foreach ($notesForType as $target => $notesForTarget) {
                $currentNotes = $this->getEditorialNotesByTypeAndTarget($type, $target);
                foreach ($notesForTarget as $note) {
                    if ($this->isNoteIdInArray($note->id, $currentNotes)) {
                        // Update the given note
                        $this->updateNote($note);
                        continue;
                    }
                    if (!self::isNoteInArray($note, $currentNotes)) {
                        // Not a duplicate, insert it
                        $res = $this->insertNote($type, $target, $note->authorId, $note->text);
                        $this->logger->debug("Note inserted, new id = " . $res);
                    }
                }
            }
        }
    }
    
    
    private function isNoteIdInArray($noteId, $theArray) 
    {
        foreach ($theArray as $note) {
            if ($noteId === $note->id) {
               return true;
            }
        }
        return false;
    }
    
    private static function isNoteInArray($theNote, $theArray) {
        foreach ($theArray as $note) {
            if (self::isNoteDataEqual($note, $theNote)) {
               return true;
            }
        }
        return false;
    }
    
    static private function isNoteDataEqual($a, $b) {
        $dataA = get_object_vars($a);
        $dataB = get_object_vars($b);
        
        unset($dataA['id']);
        unset($dataB['id']);
        unset($dataA['time']);
        unset($dataB['time']);
        return $dataA == $dataB;
    }
    
    static public function editorialNoteArrayFromRows($rows) {
        $notes = [];
        foreach ($rows as $row) {
            $edNote = EditorialNote::constructEdNoteFromRow($row);
            if ($edNote === false) {
                $this->logger->error('Bad editorial note row', $row);
                continue;
            }
            $notes[] = $edNote;
        }
        return $notes;
    }
    
    static public function editorialNoteArrayFromArray(array $theArray) {
        $notes = [];
        foreach ($theArray as $element) {
            $edNote = EditorialNote::constructEdNoteFromArray($element);
            if ($edNote === false) {
                $this->logger->error('Bad editorial note in array', $element);
                continue;
            }
            $notes[] = $edNote;
        }
        return $notes;
    }
    
}
