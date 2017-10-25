<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * Description of DareImageSource
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DareImageSource extends \AverroesProject\Plugin\Plugin {
    
    public $logger;
    
    const STUB = 'dare';
    
    public function __construct($hm, $logger) {
        parent::__construct($hm);
        $this->logger = $logger;
    }
    
    public function activate() {
        
    }
    
    public function deactivate() {
        
    }
    
    public function init() {
        
        if (! $this->hm->attachToHook('get-image-url-' . self::STUB, array($this, 'getImageUrl')) ) {
            $this->logger->info("DareImageSource Plugin: cannot attach to hook get-image-url");
            return false;
        }
        
        return true;
    }
    
    public function getMetadata() {
        
    }
    
    public function getImageUrl($param) 
    {
        if (!is_array($param)) {
            return $param;
        }
        if (!isset($param['imageSourceData']) || 
            !isset($param['imageNumber'])) {
            return $param;
        }

        $imageSourceData = $param['imageSourceData'];
        $imageNumber = $param['imageNumber'];
        
        return sprintf("https://bilderberg.uni-koeln.de/images/books/%s/bigjpg/%s-%04d.jpg", 
                    $imageSourceData, 
                    $imageSourceData, 
                    $imageNumber);
    }
   
}
