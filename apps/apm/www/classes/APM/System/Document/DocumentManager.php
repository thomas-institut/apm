<?php

namespace APM\System\Document;

use APM\EntitySystem\Schema\Entity;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\ImageSource\ImageSourceInterface;
use ThomasInstitut\EntitySystem\EntityData;

/**
 * Methods for creating, querying and manipulating documents and their pages in APM.
 *
 * Documents are entities of type Entity::tDocument. They are referred in the system
 * either by their entity id or by a legacy APM database id (which is always less or equal to 1043).
 *
 * Pages are not part of the entity system and have their own unique ids.
 *
 */
interface DocumentManager
{

    const int ORDER_BY_PAGE_NUMBER = 100;
    const int ORDER_BY_SEQ = 101;


    /**
     * Creates a document with the given name and returns
     * the id of the newly created document.
     *
     * @param string $name should not be empty
     * @param int $createdBy id of the person who is creating the document
     * @return int
     */
    public function createDocumentSimple(string $name, int $createdBy): int;


    /**
     * Creates a new document in the system with the given title, pageCount, etc.
     *
     * Returns the id of the newly created document.
     *
     * @param string $title
     * @param int|null $lang
     * @param int|null $type
     * @param int|null $imageSource
     * @param string|null $imageSourceData
     * @param int $createdBy creator's entity id
     * @return int
     */
    public function createDocument(string  $title,
                                   ?int $type, ?int    $lang,
                                   ?int    $imageSource,
                                   ?string $imageSourceData,
                                   int     $createdBy) : int;


    /**
     * Creates a new page for the given document.
     *
     * Returns the id of the newly created page.
     *
     * @param int $docId
     * @param int $pageNumber
     * @param int $lang
     * @param int $type
     * @return int
     * @throws DocumentNotFoundException
     */
    public function createPage(int $docId, int $pageNumber, int $lang, int $type = Entity::PageTypeNotSet): int;


    /**
     * Deletes a page
     *
     * @param $docId
     * @param $pageNum
     * @return void
     * @deprecated Only used in a test case, probably not needed!
     */
    public function deletePage($docId, $pageNum): void;

    /**
     * Returns the number of columns defined for the given page
     * @param int $docId
     * @param int $pageNumber
     * @return int
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException
     */
    public function getNumColumnsByDocPage(int $docId, int $pageNumber): int;

    /**
     * Returns the number of columns defined for the given page
     * @param int $pageId
     * @return int
     * @throws PageNotFoundException
     */
    public function getNumColumns(int $pageId): int;

    /**
     * Adds a column to the given page
     * @param int $docId
     * @param int $pageNumber
     * @return void
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException
     */
    public function addColumnByDocPage(int $docId, int $pageNumber) : void;


    /**
     * Adds a column to the given page
     * @param int $pageId
     * @return void
     * @throws PageNotFoundException
     */
    public function addColumn(int $pageId) : void;


    /**
     * Get the page id for a given doc and page number.
     *
     * @param int $docId
     * @param int $pageNum
     * @return int
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException
     */
    public function getPageIdByDocPage(int $docId, int $pageNum) : int;


    /**
     * Get the page id for a given doc and seq number.
     *
     * @param int $docId
     * @param int $seq
     * @return int
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException
     */
    public function getPageIdByDocSeq(int $docId, int $seq) : int;

    /**
     * Returns a (legacy) array with information about a page:
     *
     *  ``
     *    [
     *      'doc_id' => docId (int),
     *      'page_number' => pageNumber (int),
     *      'img_number'  => imageNumber (int),
     *      'seq' => sequenceNumber (int),
     *      'type' => pageType (int),
     *      'lang' => pageLanguage (int)
     *      'numCols' => numCols (int)
     *      'foliation' => foliationString (string)
     *    ]
     *  ``
     * @param int $docId
     * @param int $pageNumber
     * @return array
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException
     */
    public function getLegacyPageInfoByDocPage(int $docId, int $pageNumber): array;


    /**
     * Returns a (legacy) array with information about a page:
     *
     *  ``
     *    [
     *      'doc_id' => docId (int),
     *      'page_number' => pageNumber (int),
     *      'img_number'  => imageNumber (int),
     *      'seq' => sequenceNumber (int),
     *      'type' => pageType (int),
     *      'lang' => pageLanguage (int)
     *      'numCols' => numCols (int)
     *      'foliation' => foliationString (string)
     *    ]
     *  ``
     * @param int $pageId
     * @return array
     * @throws PageNotFoundException
     */
    public function getLegacyPageInfo(int $pageId): array;


    /**
     * @param int $pageId
     * @return PageInfo
     * @throws PageNotFoundException
     */
    public function getPageInfo(int $pageId): PageInfo;


    /**
     * Returns a (legacy) array with information about a document, taken
     * now from the entity system
     * ``
     * [
     *  'id' => docId (int) // the entity id, to be used in all requests
     *  'tid' => docId (int) // same as id, given for compatibility
     *  'title' => entity name (string)
     *  'lang' => pDocumentLanguage (int)
     *  'doc_type' => pDocumentType (int)
     *  'image_source' => pImageSource (int)
     *  'image_source_data' => pImageSourceData (string)
     *  'deep_zoom' => pUseDeepZoomForImages (bool)
     * ]
     * ``
     * @param int $docId
     * @return array
     * @throws DocumentNotFoundException
     */
    public function getLegacyDocInfo(int $docId) : array;


    /**
     * Returns a doc info object for the given document
     *
     * @param int $docId
     * @param bool $includePageIds
     * @return DocInfo
     * @throws DocumentNotFoundException
     */
    public function getDocInfo(int $docId, bool $includePageIds = false) : DocInfo;


    /**
     * Returns the legacy doc id (i.e., old database id) for a given
     * document.
     *
     * For compatibility reasons, the given docId can also be an old database id
     * but the normal use case is to call this function with an entity id
     *
     * @param int $docId
     * @return int
     * @throws DocumentNotFoundException
     */
    public function getLegacyDocId(int $docId) : int;

    /**
     * Returns the number of pages of a document
     * @param int $docId
     * @return int
     * @throws DocumentNotFoundException
     */
    public function getDocPageCount(int $docId): int;


    /**
     *  Updates the page settings: lang, foliation, type and seq
     *
     * The input array may have one or more of the parameters to change. E.g.
     *  ``
     *    [ 'lang' => newLang, 'foliation' => newFoliation, 'type' => newType, 'seq' => newSeq ]
     *  ``
     *
     * @param int $pageId
     * @param PageInfo $newPageInfo
     * @return void
     * @throws PageNotFoundException
     */
    public function updatePageSettings(int $pageId, PageInfo $newPageInfo) : void;


    /**
     *  Returns (legacy) page information for each page for the given $docId
     *
     * @param int $docId
     * @param int $order
     * @return array
     * @throws DocumentNotFoundException
     */
    public function getLegacyDocPageInfoArray(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER): array;

    /**
     *  Returns an array of PageInfo objects for each page in the given $docId
     *
     * @param int $docId
     * @param int $order
     * @return PageInfo[]
     * @throws DocumentNotFoundException
     */
    public function getDocPageInfoArray(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER): array;


    /**
     * Returns the entity data for the given document id
     *
     * Accepts an entity id or a legacy APM database id
     * @param int $docId
     * @return EntityData
     * @throws DocumentNotFoundException
     */
    public function getDocumentEntityData(int $docId) : EntityData;

    /**
     * Returns the image URL for a page
     *
     * @param int $docId
     * @param int $imageNumber
     * @param string $type e.g. ApmImageType::IMAGE_TYPE_JPG
     * @param ImageSourceInterface[] $imageSources
     * @return string
     * @throws DocumentNotFoundException
     */
    public function getImageUrl(int $docId, int $imageNumber, string $type, array $imageSources): string;

    /**
     * Returns true if the document's images are in DeepZoom format
     * @param int $docId
     * @return bool
     * @throws DocumentNotFoundException
     */
    public function isDocDeepZoom(int $docId): bool;

}