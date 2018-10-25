<?php

/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace AverroesProject\Plugin;

/**
 * Description of ImageSourcePlugin
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class ImageSourcePlugin extends \AverroesProject\Plugin\Plugin {
    
    public $logger;
    public $stub;
    
    public function __construct($hm, $logger, $stub) {
        parent::__construct($hm);
        $this->logger = $logger->withName('PLUGIN-IMGSRC-' . $stub);
        $this->stub = $stub;
    }
    
    public function activate() {
        return true;
    }
    
    public function deactivate() {
        return true;
    }
    
    public function init() {
        
        $hookGetImageUrl = 'get-image-url-' . $this->stub;
        $hookGetDocInfoHtml = 'get-docinfo-html-' . $this->stub;
        $hookGetOpenSeaDragonConfig = 'get-openseadragon-config-' . $this->stub;
        $hookGetImageSources = 'get-image-sources';
        
        // @codeCoverageIgnoreStart
        // Cannot reproduce these errors in testing
        if (! $this->hm->attachToHook($hookGetImageUrl, array($this, 'getImageUrl')) ) {
            $this->logger->error("Cannot attach to hook $hookGetImageUrl");
            return false;
        }
        if (! $this->hm->attachToHook($hookGetDocInfoHtml, array($this, 'getDocInfoHtml')) ) {
            $this->logger->error("Cannot attach to hook $hookGetDocInfoHtml");
            return false;
        }
        if (! $this->hm->attachToHook($hookGetImageSources, array($this, 'getImageSource')) ) {
            $this->logger->error("Cannot attach to hook $hookGetImageSources");
            return false;
        }
        if (! $this->hm->attachToHook($hookGetOpenSeaDragonConfig, array($this, 'getOpenSeaDragonConfig')) ) {
            $this->logger->error("Cannot attach to hook $hookGetOpenSeaDragonConfig");
            return false;
        }
        // @codeCoverageIgnoreEnd
        return true;
    }
    
    public function getMetadata() {
        return [];
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
    
    public function getImageSource($param) 
    {
        if (!is_array($param)) {
            return $param;
        }
        
        $newArray = $param;
        $newArray[] = $this->stub;
        return $newArray;
    }
    
    abstract public function realGetImageUrl($imageSourceData, $imageNumber);
    abstract public function realGetOpenSeaDragonConfig($imageSourceData, $imageNumber);
    abstract public function realGetDocInfoHtml($imageSourceData);
}
