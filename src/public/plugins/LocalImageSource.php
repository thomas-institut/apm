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
use APM\System\SystemManager;

/**
 * Description of SimpleImageSource
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class LocalImageSource extends ImageSourcePlugin {

    const URL_LOCAL_REP = 'localrep';
     
    public function __construct(SystemManager $systemManager) {
        parent::__construct($systemManager, 'local');
    }

    public function realGetImageUrl($imageSourceData, $imageNumber)  {
        return sprintf( self::URL_LOCAL_REP . "/%s/%s-%04d.jpg",
            $imageSourceData,
            $imageSourceData,
            $imageNumber);
    }
    
    public function realGetOpenSeaDragonConfig($imageSourceData, $imageNumber) {
        return sprintf("tileSources: {type: 'image', url:  '%s', buildPyramid: false,homeFillsViewer: true}", 
                $this->realGetImageUrl($imageSourceData, $imageNumber));
    }

    public function realGetDocInfoHtml($imageSourceData) {
        return 'Images stored in local repository '. self::HTML_INFO_SEPARATOR .
            '<a href="' . self::URL_LOCAL_REP . '/' . $imageSourceData . '/"' .
            ' target="_blank"> Image Folder '. self::ICON_EXTERNAL_URL .  '</a>';
    }
   
}
