<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace APM\System\Transcription;

use PDO;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\DataTable\RowDoesNotExist;
use ThomasInstitut\TimeString\TimeString;
use ThomasInstitut\ToolBox\MySqlHelper;

/**
 * Manages editorial notes
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class EdNoteManager {
    
    private MySqlHelper $dbh;
    private array $tNames;
    private LoggerInterface $logger;
    private MySqlDataTable $edNotesDataTable;
            
    public function __construct(PDO $dbConn, MySqlHelper $dbh, array $tableNames, LoggerInterface $logger)
    {
        $this->dbh = $dbh;
        $this->tNames = $tableNames;
        $this->logger = $logger;
        $this->edNotesDataTable = new MySqlDataTable($dbConn, 
                $tableNames['ednotes']);
    }

    /**
     * @param int $type
     * @param int $target
     * @return EditorialNote[]
     */
    public function getEditorialNotesByTypeAndTarget(int $type, int $target): array
    {
        $rows = $this->edNotesDataTable->findRows(['type' => $type,
            'target' => $target]);
        return $this->editorialNoteArrayFromDatabaseRows(iterator_to_array($rows));
    }
        
    public function getEditorialNotesByDocPageCol($docId, $pageNum, $colNumber=1): array
    {
        $edNotesTable = $this->tNames['ednotes'];
        $itemsTable = $this->tNames['items'];
        $elementsTable = $this->tNames['elements'];
        $pagesTable = $this->tNames['pages'];
        
        $query = "SELECT `$edNotesTable`.* from `$edNotesTable` " .
                "JOIN `$itemsTable` on `$edNotesTable`.`target`=`$itemsTable`.`id` " .
                "JOIN `$elementsTable` on `$elementsTable`.`id`= `$itemsTable`.`ce_id` " .
                "JOIN `$pagesTable` on `$pagesTable`.`id`= `$elementsTable`.`page_id` " .
                "WHERE `$pagesTable`.`doc_id`=$docId and `$pagesTable`.`page_number`=$pageNum " .
                "AND `$elementsTable`.`column_number`=$colNumber " .
                "AND `$elementsTable`.`valid_until`='9999-12-31 23:59:59.999999' " .
                "AND `$pagesTable`.`valid_until`='9999-12-31 23:59:59.999999' " .
                "AND `$itemsTable`.`valid_until`='9999-12-31 23:59:59.999999'";
        
        $rows = $this->dbh->getAllRows($query);
        return $this->editorialNoteArrayFromDatabaseRows($rows);
    }

    /**
     * @param int $pageId
     * @param int $colNumber
     * @param string $time
     * @return EditorialNote[]
     */
    public function getEditorialNotesByPageIdColWithTime(int $pageId, int $colNumber, string $time): array
    {
        $edNotes = $this->tNames['ednotes'];
        $items = $this->tNames['items'];
        $elements = $this->tNames['elements'];

        $query = "SELECT  $edNotes.* from $edNotes, $items, $elements " .
            "WHERE $edNotes.target=$items.id AND $elements.id=$items.ce_id " .
            "AND $items.valid_from<='$time' AND $items.valid_until>'$time' " .
            "AND $elements.valid_from<='$time' AND $elements.valid_until>'$time' " .
            "AND $elements.page_id=$pageId AND $elements.column_number=$colNumber ";


        $rows = $this->dbh->getAllRows($query);
        return $this->editorialNoteArrayFromDatabaseRows($rows);
    }
    

    public function rawGetEditorialNotesForListOfItems(array $itemIds) : array | false{

        if (count($itemIds) === 0) {
            return [];
        }
        $idSet = implode(',', $itemIds);
        $edNotes = $this->tNames['ednotes'];
        $query = "SELECT `$edNotes`.* FROM `$edNotes` WHERE target IN ($idSet)";
        return $this->dbh->getAllRows($query);
    }


    /**
     * Inserts a new note for item $target
     * The item and the authorId must exist in the DB, they are not checked here
     *
     * @param int $target
     * @param int $authorTid
     * @param string $text
     * @return int
     */
    public function insertInlineNote(int $target, int $authorTid, string $text ): int
    {
        return $this->insertNote(EditorialNote::INLINE, $target, $authorTid, $text);
    }
    
    public function insertNote($type, $target, $authorTid, $text): int
    {
        try {
            return $this->edNotesDataTable->createRow([
                'type' => $type,
                'target' => $target,
                'lang' => 'en',
                'author_tid' => $authorTid,
                'time' => TimeString::now(),
                'text' => $text
            ]);
        } catch (RowAlreadyExists) {
            // should never happen
            throw new RuntimeException("Could not create DB row for note");
        }
    }

    /**
     * @throws RowDoesNotExist
     * @throws InvalidRowForUpdate
     */
    public function updateNote(EditorialNote $note) : void {
        $this->edNotesDataTable->updateRow([
            'id' => $note->id,
            'type' => $note->type,
            'lang' => 'en',
            'author_tid' => $note->authorTid,
            'time' => TimeString::now(),
            'text' => $note->text,
            'target' => $note->target
        ]);
    }

    /**
     * @param EditorialNote[] $edNotes
     * @return void
     * @throws InvalidRowForUpdate
     * @throws RowDoesNotExist
     */
    public function updateNotesFromArray(array $edNotes): void
    {
        // First, group the notes by target and type
        $theNotes = [];
        $theNotes[EditorialNote::OFFLINE] = [];
        $theNotes[EditorialNote::INLINE] = [];
        foreach ($edNotes as $edNote) {
            if (!isset($theNotes[$edNote->type])) {
                $this->logger->error('Bad ed note type while updating notes from array', get_object_vars($edNote));
                continue;
            }
            $theNotes[$edNote->type][$edNote->target][] = $edNote;
        }
        
        // Now process each type
        foreach ($theNotes as $type => $notesForType) {
            foreach ($notesForType as $target => $notesForTarget) {
                $currentNotes = $this->getEditorialNotesByTypeAndTarget($type, $target);
                foreach ($notesForTarget as $note) {
                    /** @var EditorialNote $note */
                    if ($this->isNoteIdInArray($note->id, $currentNotes)) {
                        // Update the given note
                        $this->updateNote($note);
                        continue;
                    }
                    if (!self::isNoteInArray($note, $currentNotes)) {
                        // Not a duplicate, insert it
                        $res = $this->insertNote($type, $target, $note->authorTid, $note->text);
                        $this->logger->debug("Note inserted, new id = " . $res);
                    }
                }
            }
        }
    }
    
    
    private function isNoteIdInArray(int $noteId, array $theArray): bool
    {
        foreach ($theArray as $note) {
            if ($noteId === $note->id) {
               return true;
            }
        }
        return false;
    }
    
    private static function isNoteInArray(EditorialNote $theNote, array $theArray): bool
    {
        foreach ($theArray as $note) {
            /** @var EditorialNote $note */
            if (self::isNoteDataEqual($note, $theNote)) {
               return true;
            }
        }
        return false;
    }
    
    static private function isNoteDataEqual(EditorialNote $a, EditorialNote $b): bool
    {
        $dataA = get_object_vars($a);
        $dataB = get_object_vars($b);
        
        unset($dataA['id']);
        unset($dataB['id']);
        unset($dataA['time']);
        unset($dataB['time']);
        return $dataA == $dataB;
    }
    
    public function editorialNoteArrayFromDatabaseRows(array $rows): array
    {
        $notes = [];
        foreach ($rows as $row) {
            $edNote = EditorialNote::constructEdNoteFromDatabaseRow($row);
            if ($edNote === false) {
                $this->logger->error('Bad editorial note row', $row);
                continue;
            }
            $notes[] = $edNote;
        }
        return $notes;
    }
    
    static public function buildEdNoteArrayFromInputArray(array $theArray, $logger): array
    {
        $notes = [];
        foreach ($theArray as $arrayElement) {
            $edNote = EditorialNote::constructEdNoteFromArray($arrayElement);
            if ($edNote === false) {
                $logger->error('Bad editorial note in array', $arrayElement);
                continue;
            }
            if ($edNote->authorTid === 0) {
                $logger->warning("No author tid in note", get_object_vars($edNote));
            }
            $notes[] = $edNote;
        }
        return $notes;
    }
    
}
