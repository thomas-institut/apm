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

namespace Test\APM;

use APM\System\ApmContainerKey;
use APM\System\Person\InvalidPersonNameException;
use APM\System\User\InvalidUserNameException;
use APM\System\User\UserNameAlreadyInUseException;
use AverroesProject\ColumnElement\Line;
use AverroesProject\Data\DataManager;
use AverroesProject\Data\EdNoteManager;
use AverroesProject\EditorialNote;
use AverroesProject\TxText\Abbreviation;
use AverroesProject\TxText\Rubric;
use AverroesProject\TxText\Text;
use Exception;
use PHPUnit\Framework\TestCase;

use AverroesProject\TxText\ItemArray;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Test\APM\Mockup\DatabaseTestEnvironment;


/**
 * Description of ElementTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class EdNoteManagerTest extends TestCase {

    static DataManager $dataManager;

    private static ContainerInterface $container;
    /**
     * @var DatabaseTestEnvironment
     */
    private static DatabaseTestEnvironment $testEnvironment;
    private static EdNoteManager $edNoteManager;

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     * @throws Exception
     */
    public static function setUpBeforeClass() : void  {
        global $testConfig;

        self::$testEnvironment = new DatabaseTestEnvironment();
        self::$container = self::$testEnvironment->getContainer();

        self::$dataManager = self::$container->get(ApmContainerKey::SYSTEM_MANAGER)->getDataManager();
        self::$edNoteManager = self::$dataManager->edNoteManager;

    }

    /**
     * @throws Exception
     */
    public function testAddRetrieveEdNotes()
    {
        self::$testEnvironment->emptyDatabase();
        $numElements = 10;
        $numPages = 1;
        $dm = self::$dataManager;

        $docId = $dm->newDoc('Test EdNote Manager', $numPages, 'la',
            'mss', 'local', 'TESTENM-1');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }

        $editorTid = self::$testEnvironment->createUserByUsername('testenmeditor');
        $authorTid = self::$testEnvironment->createUserByUsername('testenmauthor');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorTid = $editorTid;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new Rubric($i*10+1, 0,"This is $i"));
            ItemArray::addItem($element->items, new Text($i*10+2, 1,' with text and '));
            ItemArray::addItem($element->items, new Abbreviation($i*10+3, 2,'LOL',
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
            $noteId = self::$edNoteManager->insertInlineNote($ele->items[2]->id, $authorTid, "My note for element id " . $ele->id );
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
            ItemArray::addItem($element->items, new Rubric($i*10+1, 0,"This is $i"));
            ItemArray::addItem($element->items, new Text($i*10+2, 1,' with text and '));
            ItemArray::addItem($element->items, new Abbreviation($i*10+3, 2,'Mr.',
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
        $docId = $dm->newDoc('Test EdNote Manager 2', $numPages, 'la',
            'mss', 'local', 'TESTENM-2');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }

        $editorTid = self::$testEnvironment->createUserByUsername('testenmeditor2');
        $authorTid = self::$testEnvironment->createUserByUsername('testenmauthor2');


        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorTid = $editorTid;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new Rubric($i*10+1, 0,"This is $i"));
            ItemArray::addItem($element->items, new Text($i*10+2, 1,' with text and '));
            ItemArray::addItem($element->items, new Abbreviation($i*10+3, 2,'LOL',
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
            $noteId = self::$edNoteManager->insertInlineNote($ele->items[2]->id, $authorTid, "Test 2 note for " . $ele->items[2]->id );
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

