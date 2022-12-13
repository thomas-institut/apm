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

    const IMAGE_URL_SCHEME = "%s/%s/%d/jpg";
    const IMAGE_URL_OLD_SCHEME = "%s/images/books/%s/bigjpg/%s-%04d.jpg";
    const OSD_CONFIG_SCHEME = "tileSources: {type: 'image', url:  '%s', buildPyramid: false,homeFillsViewer: true}";
    const BILDERBERG_DOC_URL_OLD_SCHEME = "%s/cgi-bin/berg.pas?page=book&book=%s";
    const BILDERBERG_DOC_URL_SCHEME = "%s/%s";
    const DARE_DOC_URL_SCHEME = "https://dare.uni-koeln.de/app/manuscripts/%s";
    /**
     * @var bool
     */
    private bool $useNewStylePaths;
    /**
     * @var string
     */
    private string $bilderBergBaseUrl;

    public function __construct($systemManager) {
        parent::__construct($systemManager, 'dare');

        $config = $systemManager->getConfig()['DareImageSource'] ?? [];
        $this->bilderBergBaseUrl = $config['BilderbergBaseUrl'] ?? 'https://bilderberg.uni-koeln.de';
        $this->useNewStylePaths = $config['NewStylePaths'] ?? false;
    }
       
    public function realGetImageUrl($imageSourceData, $imageNumber): string
    {
        if ($this->useNewStylePaths) {
            return sprintf(self::IMAGE_URL_SCHEME,
                $this->bilderBergBaseUrl,
                $imageSourceData,
                $imageNumber);
        }
        return sprintf(self::IMAGE_URL_OLD_SCHEME,
            $this->bilderBergBaseUrl,
            $imageSourceData,
            $imageSourceData,
            $imageNumber);
    }
    
    public function realGetOpenSeaDragonConfig($imageSourceData, $imageNumber) : string {
        return sprintf(self::OSD_CONFIG_SCHEME,
                $this->realGetImageUrl($imageSourceData, $imageNumber));
    }

    public function getMetadata($param): array
    {
        $data =  parent::getMetadata($param);

        $dareApiUrl = $this->systemManager->getConfig()['dareApiBaseUri'];
        $metadataSource = new DareMssMetadataSource($dareApiUrl);
        $metadataSource->setLogger($this->logger);
        $metadata = $metadataSource->getMetadata($data['sourceId']);

        return array_merge($data, $metadata);
    }

    public function realGetDocInfoHtml($imageSourceData) : string {

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
       return sprintf(self::DARE_DOC_URL_SCHEME, $dareId);
    }

    private function getBilderbergDocumentUrl(string $dareId) : string {
        if ($this->useNewStylePaths) {
            return sprintf(self::BILDERBERG_DOC_URL_SCHEME, $this->bilderBergBaseUrl, $dareId);
        }
       return sprintf(self::BILDERBERG_DOC_URL_OLD_SCHEME, $this->bilderBergBaseUrl, $dareId);
    }


   
}
