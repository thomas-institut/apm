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
class LocalImageSource extends \AverroesProject\Plugin\ImageSourcePlugin {
    
     
    public function __construct($hm, $logger) {
        parent::__construct($hm, $logger, 'local');
    }
    
    public function realGetImageUrl($imageSourceData, $imageNumber)  
    {
        return sprintf("/localrep/%s/%s-%04d.jpg", 
                    $imageSourceData, 
                    $imageSourceData, 
                    $imageNumber);
    }
    
    public function realGetDocInfoHtml($imageSourceData) {
        return 'Images stored locally &nbsp;&nbsp;&nbsp;'. 
          '<a href="/localrep/' . $imageSourceData . '/" ' . 
                ' target="_blank"> Image Folder <span class="glyphicon glyphicon-new-window"></span></a>';
    }
   
}