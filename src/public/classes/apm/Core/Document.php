<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace APM\Core;

/**
 * Description of Document
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class Document 
{ 
    private $data; 
    
    /**
     *
     * @var ObjectStore
     */
    private $pages;
    
    public function __construct() {
        $this->data = null;
        $this->pages = new ObjectStore();
    }
    
    public function getData() {
        return $this->data;
    } 
    
    public function setData($d) {
        $this->data = $d;
    } 
    
    public function addPage(Page $page) {
        return $this->pages->addObject($page);
    } 
        
    public function removePage(int $pageId) { 
        return $this->pages->deleteObject($pageId);
    } 
    
    public function getPage(int $pageId) { 
        return $this->pages->getObject($pageId);
    } 
    
    public function updatePage(int $pageId, Page $modifiedPage) {
        return $this->pages->updateObject($pageId, $modifiedPage);
    }

    public function getPageCount() : int { 
        return $this->pages->count();
    } 
    
} 