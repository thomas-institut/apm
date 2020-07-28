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

use APM\DareInterface\DareMssMetadataSource;
use APM\Plugin\ImageSourcePlugin;

/**
 * Description of DareImageSource
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DareImageSource extends ImageSourcePlugin {

   public function __construct($systemManager) {
        parent::__construct($systemManager, 'dare');
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

    public function getMetadata($param): array
    {
        $data =  parent::getMetadata($param);

        $dareApiUrl = $this->systemManager->getConfig()['dareApiBaseUri'];
        $metadata = (new DareMssMetadataSource($dareApiUrl))->getMetadata($data['sourceId']);

        return array_merge($data, $metadata);
    }

    public function realGetDocInfoHtml($imageSourceData) {

        $html = "= <em>$imageSourceData</em>";
        $html .= self::HTML_INFO_SEPARATOR;
        $html .= '<a href="' . $this->getDareDocumentUrl($imageSourceData) . '" target="_blank" title="View document in DARE">' .
                'DARE ' . self::ICON_EXTERNAL_URL .  '</a>' ;
        $html .= self::HTML_INFO_SEPARATOR;
        $html .= '<a href="' . $this->getBilderbergDocumentUrl($imageSourceData) .
                '" target="_blank" title="View document in Bilderberg">' .
            'Bilderberg ' . self::ICON_EXTERNAL_URL .  '</a>' ;
        
        return $html;

    }

    private function getDareDocumentUrl(string $dareId) : string {
       return "https://dare.uni-koeln.de/app/manuscripts/$dareId";
    }

    private function getBilderbergDocumentUrl(string $dareId) : string {
       return "https://bilderberg.uni-koeln.de/cgi-bin/berg.pas?page=book&book=$dareId";
    }


   
}
