<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\System;

use AverroesProject\Core\Document;
use AverroesProject\Core\Page;
/**
 * Description of SystemManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
interface SystemManager { 
    public function getOverallPageCounts() : int; 
    public function addDocument(Document $doc); 
    public function deleteDocument(int $docId); 
    public function getDocument(int $docId); 
    public function updateDocument(int $docId, Document $modifiedDoc); 
    public function getPage(int $docId, int $pageId); 
    public function updatePage(int $docId, int $pageId, Page $modifiedPage); 
} 
  