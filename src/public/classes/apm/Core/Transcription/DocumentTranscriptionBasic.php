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

namespace APM\Core\Transcription;

/**
 * Description of DocumentTranscriptionBasic
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DocumentTranscriptionBasic extends DocumentTranscription {
    
    /** @var array  */
    protected $pages;
    
    public function __construct() {
        $this->pages = [];
    }
    
    public function getFirstTranscribedPageId() : int {
        $pageIds = array_keys($this->pages);
        if ($pageIds === []) {
            return -1;
        }
        return $pageIds[0];
    }
    
    public function getLastTranscribedPageId() : int {
        $pageIds = array_keys($this->pages);
        if ($pageIds === []) {
            return -1;
        }
        return $pageIds[count($pageIds)-1];
    }
    
    public function getItemRange(ItemAddressInDocument $from, ItemAddressInDocument $to): array {
        if ($this->getPageCount() === 0) {
            return [];
        }
        if ($from->getPageId() > $to->getPageId()) {
            return [];
        }
        //Deal with null addresses
        if ($from->isNull()) {
            $from->setPageId($this->getFirstTranscribedPageId());
        }
        if ($to->isNull()) {
            $to->setPageId($this->getLastTranscribedPageId());
        }
        $items = [];
        for ($pageId = $from->getPageId(); $pageId <= $to->getPageId(); $pageId++) {
            $fromAddress = ItemAddressInPage::NullAddress();
            if ($pageId === $from->getPageId()) {
                $fromAddress = new ItemAddressInPage($from->getTbIndex(), $from->getItemIndex());
            }
            $toAddress = ItemAddressInPage::NullAddress();
            if ($pageId === $to->getPageId()) {
                $toAddress = new ItemAddressInPage($to->getTbIndex(), $to->getItemIndex());
            }
            $pageItems = [];
            if (isset($this->pages[$pageId])) {
              $pageItems = $this->pages[$pageId]->getItemRange($fromAddress, $toAddress);
            }
            foreach($pageItems as $pageItem){
                $items[] = new ItemInDocument(
                        new ItemAddressInDocument($pageId, 
                                $pageItem->getAddress()->getTbIndex(), 
                                $pageItem->getAddress()->getItemIndex() 
                                ),
                        $pageItem->getItem());
            }
        }
        return $items;
    }

    public function getPageCount(): int {
        return count($this->pages);
    }

    public function getPageTranscription(int $pageId): PageTranscription {
        if (!isset($this->pages[$pageId])) {
            throw new \OutOfBoundsException('Page Id not defined');
        }
        return $this->pages[$pageId];
    }

    public function setPageTranscription(int $pageId, PageTranscription $transcription) {
        $this->pages[$pageId] = $transcription;
    }

}
