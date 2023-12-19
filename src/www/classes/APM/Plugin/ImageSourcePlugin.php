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

namespace APM\Plugin;

use APM\System\SystemManager;
use Psr\Log\LoggerInterface;

/**
 * Description of ImageSourcePlugin
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class ImageSourcePlugin extends Plugin
{

    const ICON_EXTERNAL_URL = '<i class="fas fa-external-link-alt"></i>';
    const HTML_INFO_SEPARATOR = '&nbsp;&nbsp;';

    /**
     * @var LoggerInterface
     */
    public LoggerInterface  $logger;
    /**
     * @var string
     */
    public string $stub;
    /**
     * @var HookManager
     */
    protected HookManager $hookManager;
    
    public function __construct(SystemManager $systemManager, string $stub) {
        parent::__construct($systemManager);
        $this->logger = $this->systemManager->getLogger()->withName('PLUGIN-IMGSRC-' . $stub);
        $this->hookManager = $this->systemManager->getHookManager();
        $this->stub = $stub;
    }
    
    public function activate(): bool
    {
        return true;
    }
    
    public function deactivate(): bool
    {
        return true;
    }
    
    public function init(): bool
    {
        
        $hookGetImageUrl = 'get-image-url-' . $this->stub;
        $hookGetThumbnailUrl = 'get-thumbnail-url-' . $this->stub;
        $hookGetDocInfoHtml = 'get-docinfo-html-' . $this->stub;
        $hookGetOpenSeaDragonConfig = 'get-openseadragon-config-' . $this->stub;
        $hookGetDocMetadata = 'get-doc-metadata-' . $this->stub;
        $hookGetImageSources = 'get-image-sources';
        
        // @codeCoverageIgnoreStart
        // Cannot reproduce these errors in testing
        if (! $this->hookManager->attachToHook($hookGetImageUrl, array($this, 'getImageUrl')) ) {
            $this->logger->error("Cannot attach to hook $hookGetImageUrl");
            return false;
        }
        if (! $this->hookManager->attachToHook($hookGetThumbnailUrl, array($this, 'getThumbnailUrl')) ) {
            $this->logger->error("Cannot attach to hook $hookGetThumbnailUrl");
            return false;
        }
        if (! $this->hookManager->attachToHook($hookGetDocInfoHtml, array($this, 'getDocInfoHtml')) ) {
            $this->logger->error("Cannot attach to hook $hookGetDocInfoHtml");
            return false;
        }
        if (! $this->hookManager->attachToHook($hookGetImageSources, array($this, 'getImageSource')) ) {
            $this->logger->error("Cannot attach to hook $hookGetImageSources");
            return false;
        }
        if (! $this->hookManager->attachToHook($hookGetOpenSeaDragonConfig, array($this, 'getOpenSeaDragonConfig')) ) {
            $this->logger->error("Cannot attach to hook $hookGetOpenSeaDragonConfig");
            return false;
        }
        if (! $this->hookManager->attachToHook($hookGetDocMetadata, array($this, 'getMetadata')) ) {
            $this->logger->error("Cannot attach to hook $hookGetDocMetadata");
            return false;
        }
        // @codeCoverageIgnoreEnd
        return true;
    }
    
    public function getMetadata($param) : array {
        $sourceId = $param['imageSourceData'];
        $this->logger->debug('Getting metadata for source ID ' . $sourceId );
        return [
            'sourceId' => $sourceId,
            'source' => $this->stub
        ];
    }
    
    public function getImageUrl($param)
    {
        if (!is_array($param)) {
            return $param;
        }
        if (!isset($param['imageSourceData']) || 
            !isset($param['imageNumber'])) {
            return $param;
        }
        return $this->realGetImageUrl($param['imageSourceData'], $param['imageNumber']);
    }
    
    public function getDocInfoHtml($param) {
        if (!is_array($param)) {
            return $param;
        }
        if (!isset($param['imageSourceData'])) { 
            return $param;
        }

        return $this->realGetDocInfoHtml($param['imageSourceData']);
    }
    
    public function getOpenSeaDragonConfig($param) {
        if (!is_array($param)) {
            return $param;
        }
        if (!isset($param['imageSourceData']) || 
            !isset($param['imageNumber'])) {
            return $param;
        }
        return $this->realGetOpenSeaDragonConfig($param['imageSourceData'], $param['imageNumber']);
    }
    
    public function getImageSource($param): array
    {
        if (!is_array($param)) {
            return $param;
        }
        
        $newArray = $param;
        $newArray[] = $this->stub;
        return $newArray;
    }
    
    abstract public function realGetImageUrl($imageSourceData, $imageNumber) : string;
    abstract public function realGetOpenSeaDragonConfig($imageSourceData, $imageNumber) : string;
    abstract public function realGetDocInfoHtml($imageSourceData) : string;

    public function getThumbnailUrl($param) : string {
        return '';
    }
}
