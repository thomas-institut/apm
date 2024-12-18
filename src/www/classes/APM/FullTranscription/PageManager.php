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

namespace APM\FullTranscription;

use APM\FullTranscription\Exception\DocumentNotFoundException;
use APM\FullTranscription\Exception\PageNotFoundException;
use APM\FullTranscription\Exception\PageNumberNotFoundException;

/**
 * Class that manages information about pages in the APM
 *
 * Normally there will be an underlying DataTable to store the data
 *
 * @package APM\FullTranscription
 */
abstract class PageManager
{
    const ERROR_PAGE_NOT_FOUND = 101;
    const ERROR_UNKNOWN = 9999;

    /**
     * @param int $pageId
     * @return PageInfo
     * @throws PageNotFoundException
     */
    abstract public function getPageInfoById(int $pageId) : PageInfo;

    /**
     * @param int $docId
     * @param int $seq
     * @return PageInfo
     * @throws PageNotFoundException
     */
    abstract public function getPageInfoByDocSeq(int $docId, int $seq) : PageInfo;

    /**
     * @param int $docId
     * @param int $pageNumber
     * @return PageInfo
     * @throws PageNotFoundException
     */
    abstract public function getPageInfoByDocPage(int $docId, int $pageNumber) : PageInfo;

    /**
     * @param int $docId
     * @return PageInfo[]
     */
    abstract public function getPageInfoArrayForDoc(int $docId) : array;

    /**
     * @param int $pageId
     * @param PageInfo $newPageInfo
     */
    abstract public function updatePageSettings(int $pageId, PageInfo $newPageInfo) : void;

    // TODO: add new page method!
}