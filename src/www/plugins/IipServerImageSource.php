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
 * Description of DareImageSource
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class IipServerImageSource extends ImageSourcePlugin {

   public function __construct($systemManager) {
        parent::__construct($systemManager, 'iip');
    }
       
    public function realGetImageUrl($imageSourceData, $imageNumber): string
    {
        $n = sprintf("%04d", $imageNumber);
        return "https://averroes.uni-koeln.de/iipsrv/iipsrv.fcgi?DeepZoom=$imageSourceData%2F$imageSourceData-$n.jp2.dzi";
    }
    
    public function realGetOpenSeaDragonConfig($imageSourceData, $imageNumber): string
    {

        return sprintf("tileSources: '%s'",
            $this->realGetImageUrl($imageSourceData, $imageNumber));
//        return sprintf("tileSources: {type: 'image', url:  '%s', buildPyramid: false,homeFillsViewer: true}",
//                $this->realGetImageUrl($imageSourceData, $imageNumber));
    }

//    public function getMetadata($param): array
//    {
//        $data =  parent::getMetadata($param);
//
//        $dareApiUrl = $this->systemManager->getConfig()['dareApiBaseUri'];
//        $metadata = (new DareMssMetadataSource($dareApiUrl))->getMetadata($data['sourceId']);
//
//        return array_merge($data, $metadata);
//    }

    public function realGetDocInfoHtml($imageSourceData) : string{
        return "<em>IIP Server</em>";
    }

//    private function getDareDocumentUrl(string $dareId) : string {
//       return "https://dare.uni-koeln.de/app/manuscripts/$dareId";
//    }
//
//    private function getBilderbergDocumentUrl(string $dareId) : string {
//       return "https://bilderberg.uni-koeln.de/cgi-bin/berg.pas?page=book&book=$dareId";
//    }


   
}
