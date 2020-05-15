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

use APM\Plugin\ImageSourcePlugin;

/**
 * Description of SimpleImageSource
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class AverroesServerImageSource extends ImageSourcePlugin {

   const URL_AVERROES_SERVER_REP = 'https://averroes.uni-koeln.de/localrep';

   public function __construct($systemManager) {
        parent::__construct($systemManager, 'averroes-server');
    }
    
    public function realGetImageUrl($imageSourceData, $imageNumber)  {
        return sprintf( self::URL_AVERROES_SERVER_REP . "/%s/%s-%04d.jpg",
                    $imageSourceData, 
                    $imageSourceData, 
                    $imageNumber);
    }
    
    public function realGetOpenSeaDragonConfig($imageSourceData, $imageNumber) {
        return sprintf("tileSources: {type: 'image', url:  '%s', buildPyramid: false,homeFillsViewer: true}", 
                $this->realGetImageUrl($imageSourceData, $imageNumber));
    }
    
    public function realGetDocInfoHtml($imageSourceData) {
        return 'Images stored in the Averroes Project server '. self::HTML_INFO_SEPARATOR .
          '<a href="' . self::URL_AVERROES_SERVER_REP . '/' . $imageSourceData . '/"' .
                ' target="_blank"> Image Folder '. self::ICON_EXTERNAL_URL .  '</a>';
    }
   
}
