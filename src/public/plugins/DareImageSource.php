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
        if (! $this->hm->attachToHook('get-docinfo-html-' . self::STUB, array($this, 'getDocInfoHtml')) ) {
            $this->logger->info("DareImageSource Plugin: cannot attach to hook get-docinfo-html");
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
    
    public function getDocInfoHtml($param) {
         if (!is_array($param)) {
            return $param;
        }
        if (!isset($param['imageSourceData'])) { 
            return $param;
        }

        $imageSourceData = $param['imageSourceData'];
        $html = '= Bilderberg ' . $imageSourceData . ' &nbsp;&nbsp;';
        $html .= '<a href=" http://dare.uni-koeln.de/dare-cgi/permalinks.pas?darepurl=scana-' .
                $imageSourceData . 
                '" target="_blank" title="View document in DARE">' . 
                'DARE <span class="glyphicon glyphicon-new-window"></span></a>' ;
        $html .= '&nbsp;&nbsp;';
        $html .= '<a href="https://bilderberg.uni-koeln.de/cgi-bin/berg.pas?page=book&book=' . 
                $imageSourceData . 
                '" target="_blank" title="View document in Bilderberg">' . 
                'Bilderberg <span class="glyphicon glyphicon-new-window"></span></a>';
        
        return $html;

    }
   
}
