<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\System;

use AverroesProject\Core\Document;
use AverroesProject\Core\Page;
use AverroesProject\Core\ObjectStore;

/**
 * Description of InMemorySystemManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class InMemorySystemManager implements SystemManager { 
    
    /**
     *
     * @var ObjectStore
     */
    private $docs; 
    
    public function getOverallPageCounts() : int { 
        $counts = []; 
        foreach ($this->docs as $id => $doc) { 
            $counts[$id] = $doc->getPageCount(); 
        } 
        return $counts; 
    } 
    
    public function addDocument(Document $doc) { 
        return $this->docs->addObject($doc);
    } 
       
    public function deleteDocument($docId) { 
        // Here we can check whether the document 
        // can indeed be deleted safely, e.g. whether 
        // it doesn't have any data that should be kept. 
        
        return $this->docs->deleteObject($docId);

    } 
    
    public function getDocument($docId) { 
        return $this->docs->getObject($docId);
    } 
    
    public function updateDocument($docId, Document $modifiedDoc) { 
        return $this->docs->updateObject($docId, $modifiedDoc);
    } 
    
    public function updatePage($docId, $pageId, Page $modifiedPage) {
        
        $curDoc = $this->docs->getObject($docId);
        if ($curDoc === false) {
            return false;
        }
        /* @var $modDoc Document */
        $modDoc = clone $curDoc;
        $modDoc->updatePage($pageId, $modifiedPage);
        $this->docs->updateObject($docId, $modDoc);
    } 
    
    public function getPage($docId, $pageId) {
        /* @var $curDoc Document */
        $curDoc = $this->docs->getObject($docId);
        if ($curDoc === false) {
            return false;
        }
        return $curDoc->getPage($pageId);
    }
}