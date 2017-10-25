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
class DareImageSource extends \AverroesProject\Plugin\ImageSourcePlugin {
    
   
    
    public function __construct($hm, $logger) {
        parent::__construct($hm, $logger, 'dare');
    }
       
    public function realGetImageUrl($imageSourceData, $imageNumber) 
    {
        return sprintf("https://bilderberg.uni-koeln.de/images/books/%s/bigjpg/%s-%04d.jpg", 
                    $imageSourceData, 
                    $imageSourceData, 
                    $imageNumber);
    }
    
    public function realGetDocInfoHtml($imageSourceData) {
        $html = '= Bilderberg ' . $imageSourceData . ' &nbsp;&nbsp;';
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
