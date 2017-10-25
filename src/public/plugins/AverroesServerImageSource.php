<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * Description of SimpleImageSource
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class AverroesServerImageSource extends \AverroesProject\Plugin\ImageSourcePlugin {
    
     
    public function __construct($hm, $logger) {
        parent::__construct($hm, $logger, 'averroes-server');
    }
    
    public function realGetImageUrl($imageSourceData, $imageNumber)  
    {
        return sprintf("http://averroes.uni-koeln.de/localrep/%s/%s-%04d.jpg", 
                    $imageSourceData, 
                    $imageSourceData, 
                    $imageNumber);
    }
    
    public function realGetDocInfoHtml($imageSourceData) {
        return 'Images stored in the Averroes Project server &nbsp;&nbsp;&nbsp;'. 
          '<a href="http://averroes.uni-koeln.de/localrep/' . $imageSourceData . '/" ' . 
                ' target="_blank"> Image Folder <span class="glyphicon glyphicon-new-window"></span></a>';
    }
   
}
