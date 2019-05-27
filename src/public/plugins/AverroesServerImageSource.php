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
 * Description of SimpleImageSource
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class AverroesServerImageSource extends \APM\Plugin\ImageSourcePlugin {
    
     
   public function __construct($sm) {
        parent::__construct($sm, 'averroes-server');
    }
    
    public function realGetImageUrl($imageSourceData, $imageNumber)  
    {
        return sprintf("http://averroes.uni-koeln.de/localrep/%s/%s-%04d.jpg", 
                    $imageSourceData, 
                    $imageSourceData, 
                    $imageNumber);
    }
    
    public function realGetOpenSeaDragonConfig($imageSourceData, $imageNumber) {
        return sprintf("tileSources: {type: 'image', url:  '%s', buildPyramid: false,homeFillsViewer: true}", 
                $this->realGetImageUrl($imageSourceData, $imageNumber));
    }
    
    public function realGetDocInfoHtml($imageSourceData) {
        return 'Images stored in the Averroes Project server &nbsp;&nbsp;&nbsp;'. 
          '<a href="http://averroes.uni-koeln.de/localrep/' . $imageSourceData . '/" ' . 
                ' target="_blank"> Image Folder <span class="glyphicon glyphicon-new-window"></span></a>';
    }
   
}
