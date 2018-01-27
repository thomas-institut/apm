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
class DareDeepZoomImageSource extends \AverroesProject\Plugin\ImageSourcePlugin {
    
   
    
    public function __construct($hm, $logger) {
        parent::__construct($hm, $logger, 'dare-deepzoom');
    }
       
    public function realGetImageUrl($imageSourceData, $imageNumber) 
    {
        return sprintf("https://bilderberg.uni-koeln.de/iipsrv/iipsrv.fcgi?DeepZoom=books/%s/pyratiff/%s-%04d.tif.dzi", 
                    $imageSourceData, 
                    $imageSourceData, 
                    $imageNumber);
    }
    
   public function realGetOpenSeaDragonConfig($imageSourceData, $imageNumber) {
        return sprintf("tileSources: '%s'", 
                $this->realGetImageUrl($imageSourceData, $imageNumber));
    }
    
    public function realGetDocInfoHtml($imageSourceData) {
        $html = '= Bilderberg ' . $imageSourceData . ' (DZ) &nbsp;&nbsp;';
        $html .= '<a href=" http://dare.uni-koeln.de/dare-cgi/permalinks.pas?darepurl=scana-' .
                $imageSourceData . 
                '-0001" target="_blank" title="View document in DARE">' . 
                'DARE <span class="glyphicon glyphicon-new-window"></span></a>' ;
        $html .= '&nbsp;&nbsp;';
        $html .= '<a href="https://bilderberg.uni-koeln.de/cgi-bin/berg.pas?page=book&book=' . 
                $imageSourceData . 
                '" target="_blank" title="View document in Bilderberg">' . 
                'Bilderberg <span class="glyphicon glyphicon-new-window"></span></a>';
        
        return $html;

    }
   
}