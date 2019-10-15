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

namespace AverroesProject;
require "../vendor/autoload.php";
require_once 'SiteMockup/DatabaseTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\ItemArray;
use APM\Plugin\HookManager;

/**
 * Description of ElementTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class EdNoteManagerTest extends TestCase {
        /**
     *     
     * @var AverroesProject\Data\DataManager
     */
    static $dataManager;
    static $edNoteManager;
    
    public static function setUpBeforeClass() {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('EDNOTE-TEST');
        $logger->pushHandler($logStream);
        $hm = new HookManager();
        self::$dataManager = DatabaseTestEnvironment::getDataManager($logger, $hm);
        self::$edNoteManager = self::$dataManager->edNoteManager;
        
    }
    
    public function testAddRetrieveEdNotes()
    {
        DatabaseTestEnvironment::emptyDatabase();
        $numElements = 10;
        $numPages = 1;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test EdNote Manager', 'TENM-1', $numPages, 'la', 
                'mss', 'local', 'TESTENM-1');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editorId = $dm->userManager->createUserByUsername('testenmeditor');
        $authorId = $dm->userManager->createUserByUsername('testenmauthor');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = new ColumnElement\Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editorId;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new TxText\Rubric($i*10+1, 0,"This is $i"));
            ItemArray::addItem($element->items, new TxText\Text($i*10+2, 1,' with text and '));
            ItemArray::addItem($element->items, new TxText\Abbreviation($i*10+3, 2,'LOL', 
                    'laughing out loud'));
            $newElement = $dm->insertNewElement($element);
            $this->assertNotFalse($newElement);
            $this->assertNotEquals(0, $newElement->id);
            $this->assertEquals($i, $newElement->seq);
            $this->assertCount(count($element->items), 
                    $newElement->items);
        }
        
        $edNotes = self::$edNoteManager->getEditorialNotesByDocPageCol($docId, $pageId, 1);
        
        $this->assertEquals([], $edNotes);
        
        $elements = $dm->getColumnElements($docId, 1, 1);
        foreach ($elements as $ele) {
            $noteId = self::$edNoteManager->insertInlineNote($ele->items[2]->id, $authorId, "My note for element id " . $ele->id );
            $this->assertNotFalse($noteId);
        }
        
        $edNotes2 = self::$edNoteManager->getEditorialNotesByDocPageCol($docId, $pageId, 1);
        //print_r($edNotes2);
        $this->assertCount($numElements, $edNotes2);
        
        // Changing item content
        // This will delete the items with ednotes and create new ones
        // the new items do not keep the notes.
        for ($i=0; $i<$numElements; $i++) {
            $element = clone $elements[$i];
            $element->items = [];
            ItemArray::addItem($element->items, new TxText\Rubric($i*10+1, 0,"This is $i"));
            ItemArray::addItem($element->items, new TxText\Text($i*10+2, 1,' with text and '));
            ItemArray::addItem($element->items, new TxText\Abbreviation($i*10+3, 2,'Mr.', 
                    'Mister'));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);
            list ($elementId, $itemsIds) = $dm->updateElement($element, $elements[$i]);
        }
        
        $edNotes3 = self::$edNoteManager->getEditorialNotesByDocPageCol($docId, $pageId, 1);
        //print_r($edNotes2);
        $this->assertCount(0, $edNotes3);
    }
    
    /**
     * @depends testAddRetrieveEdNotes
     */
    public function testUpdateNotes()
    {
        $numElements = 10;
        $numPages = 1;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test EdNote Manager 2', 'TENM-2', $numPages, 'la', 
                'mss', 'local', 'TESTENM-2');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editorId = $dm->userManager->createUserByUsername('testenmeditor2');
        $authorId = $dm->userManager->createUserByUsername('testenmauthor2');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = new ColumnElement\Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editorId;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new TxText\Rubric($i*10+1, 0,"This is $i"));
            ItemArray::addItem($element->items, new TxText\Text($i*10+2, 1,' with text and '));
            ItemArray::addItem($element->items, new TxText\Abbreviation($i*10+3, 2,'LOL', 
                    'laughing out loud'));
            $newElement = $dm->insertNewElement($element);
            $this->assertNotFalse($newElement);
            $this->assertNotEquals(0, $newElement->id);
            $this->assertEquals($i, $newElement->seq);
            $this->assertCount(count($element->items), 
                    $newElement->items);
        }
        
        $edNotes = self::$edNoteManager->getEditorialNotesByDocPageCol($docId, $pageId, 1);
        
        $this->assertEquals([], $edNotes);
        
        $elements = $dm->getColumnElements($docId, 1, 1);
        foreach ($elements as $ele) {
            $noteId = self::$edNoteManager->insertInlineNote($ele->items[2]->id, $authorId, "Test 2 note for " . $ele->items[2]->id );
            $this->assertNotFalse($noteId);
        }
        
        // No changes to the notes
        for ($i = 0; $i < $numElements; $i++) {
            $edNotes = self::$edNoteManager->getEditorialNotesByTypeAndTarget(EditorialNote::INLINE, $elements[$i]->items[2]->id);
            $this->assertCount(1, $edNotes);
            self::$edNoteManager->updateNotesFromArray($edNotes);
            $edNotes2 = self::$edNoteManager->getEditorialNotesByTypeAndTarget(EditorialNote::INLINE, $elements[$i]->items[2]->id);
            $this->assertEquals($edNotes, $edNotes2);
        }
        
        // Change in the notes = new notes added
        for ($i = 0; $i < $numElements; $i++) {
            $edNotes = self::$edNoteManager->getEditorialNotesByTypeAndTarget(EditorialNote::INLINE, $elements[$i]->items[2]->id);
            $this->assertCount(1, $edNotes);
            $edNotes[0]->text = "New note for " . $elements[$i]->items[2]->id;
            $edNotes[0]->id = -100;
            self::$edNoteManager->updateNotesFromArray($edNotes);
            $edNotes2 = self::$edNoteManager->getEditorialNotesByTypeAndTarget(EditorialNote::INLINE, $elements[$i]->items[2]->id);
            $this->assertCount(2, $edNotes2);
        }
        
        // Adding new notes 
        for ($i = 0; $i < $numElements; $i++) {
            $edNotes = self::$edNoteManager->getEditorialNotesByTypeAndTarget(EditorialNote::INLINE, $elements[$i]->items[2]->id);
            $this->assertCount(2, $edNotes);
            $newNote = clone $edNotes[1];
            $newNote->id = -100;
            $newNote->text = "Even newer note for " . $elements[$i]->items[2]->id;
            $edNotes[] = $newNote;
            self::$edNoteManager->updateNotesFromArray($edNotes);
            $edNotes2 = self::$edNoteManager->getEditorialNotesByTypeAndTarget(EditorialNote::INLINE, $elements[$i]->items[2]->id);
            $this->assertCount(3, $edNotes2);
        }
        
    }
    
}

