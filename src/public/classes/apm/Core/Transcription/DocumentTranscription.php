<?php

/*
 * 
 * Copyright (C) 2018 Universität zu Köln
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

namespace APM\Core\Transcription;

/**
 * A transcription of a document 
 * 
 * Conceptually a document transcription is simply set of page transcriptions
 * retrievable by some page identifier. 
 * 
 * The transcription items within the page can be address with ItemAddressInDocument,
 * which is simply the ItemAddressInPage plus the page id.
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class DocumentTranscription {
    
    const UNDEFINED_PAGE = -1;
    /**
     * Returns the number of pages with transcription 
     */
    abstract public function getPageCount() : int;
    
    /**
     * Returns the ids of the first and last pages
     * or self::UNDEFINED_PAGE is there are no pages
     */
    abstract public function getFirstTranscribedPageId() : int;
    abstract public function getLastTranscribedPageId() : int;
    /**
     * Gets the page transcription of the given pageId.
     * If the pageId is not defined, throws an OutOfBoundsException
     */
    abstract public function getPageTranscription(int $pageId) : PageTranscription;
    
    /**
     * Sets the page transcription for the given pageId
     */
    abstract public function setPageTranscription(int $pageId, PageTranscription $transcription);
    

    /**
     * Returns an array of ItemInDocument 
     */
    abstract public function getItemRange(ItemAddressInDocument $from, ItemAddressInDocument $to) : array;
    
}
