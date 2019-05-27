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

/**
 * Description of DareImageSource
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DareImageSource extends \APM\Plugin\ImageSourcePlugin {
    
   
    
   public function __construct($sm) {
        parent::__construct($sm, 'dare');
    }
       
    public function realGetImageUrl($imageSourceData, $imageNumber) 
    {
        return sprintf("https://bilderberg.uni-koeln.de/images/books/%s/bigjpg/%s-%04d.jpg", 
                    $imageSourceData, 
                    $imageSourceData, 
                    $imageNumber);
    }
    
    public function realGetOpenSeaDragonConfig($imageSourceData, $imageNumber) {
        return sprintf("tileSources: {type: 'image', url:  '%s', buildPyramid: false,homeFillsViewer: true}", 
                $this->realGetImageUrl($imageSourceData, $imageNumber));
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
