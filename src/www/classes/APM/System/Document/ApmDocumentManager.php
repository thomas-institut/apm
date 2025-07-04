<?php

namespace APM\System\Document;


use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidEntityTypeException;
use APM\EntitySystem\Exception\InvalidObjectException;
use APM\EntitySystem\Exception\InvalidStatementException;
use APM\EntitySystem\Exception\InvalidSubjectException;
use APM\EntitySystem\Schema\Entity;
use APM\EntitySystem\ValueToolBox;
use APM\System\ApmImageType;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\ImageSource\ImageSourceInterface;
use APM\System\ImageSource\NullImageSource;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use RuntimeException;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\EntitySystem\EntityData;

class ApmDocumentManager implements DocumentManager, LoggerAwareInterface
{
    use LoggerAwareTrait;

    private ?ApmEntitySystemInterface $entitySystem = null;
    private ?DataTable $pagesDataTable = null;
    /**
     * @var callable
     */
    private $getEntitySystem;
    /**
     * @var callable
     */
    private $getPagesDataTable;

    private bool $debug;
    private InMemoryDataCache $cache;

    const string PAGE_ARRAY_LEGACY = 'legacy';
    const string PAGE_ARRAY_INFO = 'info';
    const string PAGE_ARRAY_IDS = 'ids';

    const int MemoryCacheTtl = 1;

    public function __construct(callable $getEntitySystem, callable $getPagesDataTable)
    {
        $this->getEntitySystem = $getEntitySystem;
        $this->getPagesDataTable = $getPagesDataTable;
        $this->logger = new NullLogger();
        $this->debug = true;
        $this->cache = new InMemoryDataCache();
    }

    private function getEntitySystem() : ApmEntitySystemInterface {
        if ($this->entitySystem === null) {
            $this->entitySystem = call_user_func($this->getEntitySystem);
        }
        return $this->entitySystem;
    }

    private function getPagesDataTable() : DataTable {
        if ($this->pagesDataTable === null) {
            $this->pagesDataTable = call_user_func($this->getPagesDataTable);
        }
        return $this->pagesDataTable;
    }

    private function checkEntity(int $entity, int $type) : bool {
        try {
            if ($this->getEntitySystem()->getEntityType($entity) !== $type) {
                return false;
            }
        } catch (EntityDoesNotExistException) {
           return false;
        }
        return true;
    }

    /**
     * @param string $name
     * @param int $createdBy
     * @inheritDoc
     */
    public function createDocumentSimple(string $name, int $createdBy): int {
        return $this->createDocument($name, null,null, null, null, $createdBy);
    }

    /**
     * @inheritDoc
     */
    public function createDocument(string $title, ?int $type, ?int $lang, ?int $imageSource, ?string $imageSourceData, int $createdBy): int
    {
        $es = $this->getEntitySystem();

        if ($lang !== null && !$this->checkEntity($lang, Entity::tLanguage)) {
            throw new InvalidArgumentException("Given language '$lang' is not a valid language");
        }
        if ($type !== null && !$this->checkEntity($type, Entity::tDocumentType)) {
            throw new InvalidArgumentException("Given type '$type' is not a valid document type");
        }
        if ($imageSource !== null && !$this->checkEntity($imageSource, Entity::tImageSource)) {
            throw new InvalidArgumentException("Given image source '$imageSource' is not a valid image source");
        }

        $imageSourceData = trim($imageSourceData ?? '');
        try {
            $id = $es->createEntity(Entity::tDocument, $title, '', $createdBy);
        } catch (InvalidEntityTypeException $e) {
            // should never happen!
            throw new RuntimeException("Exception creating entity: " . $e->getMessage(), 0, $e);
        }
        try {
            if ($lang !== null) {
                $es->makeStatement($id, Entity::pDocumentLanguage, $lang, $createdBy,
                    "Setting language when creating document");
            }
            if ($type !== null) {
                $es->makeStatement($id, Entity::pDocumentType, $type, $createdBy,
                    "Setting document type when creating document");
            }
            if ($imageSource !== null) {
                $es->makeStatement($id, Entity::pImageSource, $imageSource, $createdBy,
                    "Setting image source when creating document");
            }
            if ($imageSourceData !== '') {
                $es->makeStatement($id, Entity::pImageSourceData, $imageSourceData, $createdBy,
                    "Setting image source data when creating document");
            }
        } catch (InvalidObjectException|InvalidSubjectException|InvalidStatementException $e) {
            // should never happen
            throw new RuntimeException("Exception making statements: " . $e->getMessage(), 0, $e);
        }
        return $id;
    }

    /**
     * @inheritDoc
     */
    public function createPage(int $docId, int $pageNumber, int $lang, int $type = Entity::PageTypeNotSet): int
    {

        if (!$this->checkEntity($lang, Entity::tLanguage)) {
            throw new InvalidArgumentException("Given language '$lang' is not a valid language");
        }
        if (!$this->checkEntity($type, Entity::tPageType)) {
            throw new InvalidArgumentException("Given type '$type' is not a valid document type");
        }

        // make sure the document exists
        $this->getDocumentEntityData($docId);

        $docIdForDb = $this->getLegacyDocId($docId);

        $page = [
            'doc_id' => $docIdForDb,
            'page_number' => $pageNumber,
            'img_number' => $pageNumber,
            'seq' => $pageNumber,
            'type' => $type,
            'lang' => $lang
            // foliation => defaults to null in DB
        ];

        try {
            return $this->getPagesDataTable()->createRow($page);
        } catch (RowAlreadyExists $e) {
            // should never happen
            throw new RuntimeException("RowAlreadyExists exception creating page: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @inheritDoc
     */
    public function deletePage($docId, $pageNum): void
    {
        // probably not needed
    }

    /**
     * @inheritDoc
     */
    public function getNumColumnsByDocPage(int $docId, int $pageNumber): int
    {
        return $this->getNumColumns($this->getPageIdByDocPage($docId, $pageNumber));
    }

    /**
     * @inheritDoc
     */
    public function getNumColumns(int $pageId): int
    {
        return $this->getPageInfo($pageId)->numCols;
    }

    /**
     * @inheritDoc
     */
    public function addColumnByDocPage(int $docId, int $pageNumber): void
    {
        $this->addColumn($this->getPageIdByDocPage($docId, $pageNumber));
    }

    /**
     * @inheritDoc
     */
    public function addColumn(int $pageId): void
    {
        $pageInfo = $this->getPagesDataTable()->getRow($pageId);
        if ($pageInfo === null) {
           throw new PageNotFoundException("Page $pageId not found");
        }
        try {
            $this->getPagesDataTable()->updateRow([
                'id' => $pageId,
                'num_cols' => $pageInfo['num_cols']+1
            ]);
        } catch (InvalidRowForUpdate $e) {
            throw new RuntimeException("InvalidRowForUpdate exception updating page: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @inheritDoc
     */
    public function getPageIdByDocPage(int $docId, int $pageNum): int
    {

        $rows = $this->getPagesDataTable()->findRows([
            'doc_id' => $this->getLegacyDocId($docId),
            'page_number'=> $pageNum
        ],1);
        if (count($rows) === 0) {
            throw new PageNotFoundException("Page doc $docId not found");
        }
        return $rows->getFirst()['id'];
    }

    /**
     * @inheritDoc
     */
    public function getPageIdByDocSeq(int $docId, int $seq): int
    {
        $rows = $this->getPagesDataTable()->findRows([
            'doc_id' => $this->getLegacyDocId($docId),
            'seq'=> $seq
        ],1);
        if (count($rows) === 0) {
            return -1;
        }
        return $rows->getFirst()['id'];
    }

    /**
     * @inheritDoc
     */
    public function getLegacyPageInfoByDocPage(int $docId, int $pageNumber): array
    {
        return $this->getLegacyPageInfo($this->getPageIdByDocPage($docId, $pageNumber));
    }

    /**
     * @inheritDoc
     */
    public function getLegacyPageInfo(int $pageId): array
    {
        $row = $this->getPagesDataTable()->getRow($pageId);
        if ($row === null) {
            throw new PageNotFoundException("Page $pageId not found");
        }

        return $this->getLegacyPageInfoFromDbRow($row);
    }

    public function getPageInfo(int $pageId): PageInfo
    {
        $row = $this->getPagesDataTable()->getRow($pageId);
        if ($row === null) {
            throw new PageNotFoundException("Page $pageId not found");
        }
        return PageInfo::createFromDatabaseRow($row);
    }

    private function getLegacyPageInfoFromDbRow(array $row): array {
        // Sanitize types!
        $row['page_number'] = intval($row['page_number']);
        $row['seq'] = intval($row['seq']);
        $row['num_cols'] = intval($row['num_cols']);
        $row['foliation'] = $row['foliation'] ?? strval($row['seq']);
        $row['foliationIsSet'] = isset($row['foliation']);
        return $row;
    }

    /**
     * @inheritDoc
     */
    public function getDocPageCount(int $docId): int
    {
        return $this->getPagesDataTable()->findRows(['doc_id' => $this->getLegacyDocId($docId) ])->count();
    }


    /**
     * @inheritDoc
     */
    public function getLegacyDocId(int $docId): int {
        $data = $this->getDocumentEntityData($docId);
        $dbId = $data->getObjectForPredicate(Entity::pLegacyApmDatabaseId);
        return $dbId !== null ? $dbId : $docId;
    }


    /**
     * @inheritDoc
     */
    public function updatePageSettings(int $pageId, PageInfo $newPageInfo): void
    {
        $newPageInfo->pageId = $pageId;
        if ( $newPageInfo->pageNumber === 0 ||$newPageInfo->sequence === 0 ) {
            $this->logger->error("Invalid new page settings to update page $pageId", $newPageInfo->getDatabaseRow());
            throw new InvalidArgumentException("Invalid new settings to update page $pageId");
        }

        $currentPageInfo = $this->getPageInfo($pageId);
        $databaseRow = $newPageInfo->getDatabaseRow();
        // check each individual column in the database row to see
        // if it needs to be updated
        unset($databaseRow['doc_id']); // must not update doc id, it is set at creation time only
        if ($newPageInfo->pageNumber === $currentPageInfo->pageNumber) {
            unset($databaseRow['page_number']);
        }
        if ($newPageInfo->imageNumber === $currentPageInfo->imageNumber) {
            unset($databaseRow['image_number']);
        }
        if ($newPageInfo->sequence === $currentPageInfo->sequence) {
            unset($databaseRow['seq']);
        }
        if ($newPageInfo->type === $currentPageInfo->type) {
            unset($databaseRow['type']);
        } else {
            if (!$this->checkEntity($newPageInfo->type, Entity::tPageType)) {
                throw new InvalidArgumentException("Given type '$newPageInfo->type' is not a valid page type");
            }
        }
        if ($newPageInfo->lang === $currentPageInfo->lang) {
            unset($databaseRow['lang']);
        } else {
            if (!$this->checkEntity($newPageInfo->lang, Entity::tLanguage)) {
                throw new InvalidArgumentException("Given language '$newPageInfo->lang' is not a valid language");
            }
        }

        if ($newPageInfo->numCols === $currentPageInfo->numCols) {
            unset($databaseRow['num_cols']);
        }

        if ($newPageInfo->foliationIsSet === $currentPageInfo->foliationIsSet && $newPageInfo->foliation === $currentPageInfo->foliation) {
             unset($databaseRow['foliation']);
        }

        if (count(array_keys($databaseRow)) <= 1) {
            // only the row id is left in the database row, nothing to update
            return;
        }

        try {
            $this->getPagesDataTable()->updateRow($databaseRow);
        } catch (InvalidRowForUpdate $e) {
            throw new RuntimeException("InvalidRowForUpdate exception: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @throws DocumentNotFoundException
     */
    private function getPageArray(int $docId, int $order, $dataType): array
    {
        $this->debug && $this->logger->debug("Getting doc page info array for doc $docId",
            [ 'dbId' => $this->getLegacyDocId($docId)]);

        $dt = $this->getPagesDataTable();

        $findResult = $dt->findRows(['doc_id' => $this->getLegacyDocId($docId)]);

        $this->debug && $this->logger->debug("Found " . $findResult->count() . " pages");
        $rows = [...$findResult];

        usort($rows, function($a, $b) use ($order) {
            if ($order === self::ORDER_BY_SEQ) {
                return $a['seq'] - $b['seq'];
            } else {
                // any other order type defaults to order by page
                return $a['page_number'] - $b['page_number'];
            }
        });

        return match ($dataType) {
            self::PAGE_ARRAY_LEGACY => array_map(function ($row) {
                return $this->getLegacyPageInfoFromDbRow($row);
            }, $rows),
            self::PAGE_ARRAY_IDS => array_map(function ($row) {
                return $row['id'];
            }, $rows),
            self::PAGE_ARRAY_INFO => array_map(function ($row) {
                return PageInfo::createFromDatabaseRow($row);
            }, $rows),
            default => throw new InvalidArgumentException("Unknown data type '$dataType'"),
        };
    }

    /**
     * @inheritDoc
     */
    public function getLegacyDocPageInfoArray(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER): array
    {
        return $this->getPageArray($docId, $order, self::PAGE_ARRAY_LEGACY);
    }

    /**
     * @inheritDoc
     */
    public function getDocPageInfoArray(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER): array {
        return $this->getPageArray($docId, $order, self::PAGE_ARRAY_INFO);
    }

    /**
     * @inheritDoc
     */
    public function getDocumentEntityData(int $docId): EntityData
    {
        $entityId = $docId;
        if ($docId < 2000) {
            // for sure this is a legacy doc id
            // use the mem cache, in case we need to get this info many times
            try {
                $entityId = $this->cache->get("entity-id-$docId");
            } catch (ItemNotInCacheException) {
                $statements = $this->getEntitySystem()->getStatements(null, Entity::pLegacyApmDatabaseId, strval($docId));
                if (count($statements) === 0) {
                    throw new DocumentNotFoundException("Document with legacy docId $docId not found");
                }
                $entityId = $statements[0]->subject;
                // this never changes, so it's OK not to expire it in the cache
                $this->cache->set("entity-id-$docId", $entityId);
            }
        }

        try {
            return unserialize($this->cache->get("doc-data-$docId"));
        } catch (ItemNotInCacheException) {
            try {
                $data = $this->getEntitySystem()->getEntityData($entityId);
                $this->cache->set("doc-data-$docId", serialize($data), self::MemoryCacheTtl);
                return $data;
            } catch (EntityDoesNotExistException) {
                throw new DocumentNotFoundException("Document $docId not found");
            }
        }
    }

    /**
     * @param int $docId
     * @param int $imageNumber
     * @param string $type
     * @param array $imageSources
     * @inheritDoc
     */
    public function getImageUrl(int $docId, int $imageNumber, string $type, array $imageSources): string
    {
        $docImageSource = $this->getDocAttribute($docId, Entity::pImageSource);
        if ($docImageSource === null) {
            // no image source set for the document
            return '';
        }
        /** @var ImageSourceInterface $imageSource */
        $imageSource = $imageSources[$docImageSource] ?? new NullImageSource();
        if ($type === ApmImageType::IMAGE_TYPE_DEFAULT) {
            $type = ApmImageType::IMAGE_TYPE_JPG;

            if ($this->isDocDeepZoom($docId)) {
                $type = ApmImageType::IMAGE_TYPE_DEEP_ZOOM;
            }
        }
        $docImageSourceData = $this->getDocAttribute($docId, Entity::pImageSourceData);

        return $imageSource->getImageUrl($type, $docImageSourceData, $imageNumber);
    }


    /**
     * @throws DocumentNotFoundException
     */
    private function getDocAttribute(int $docId, int $predicate) : int|string|null {

        $key = "doc_attribute-$docId-$predicate";
        try {
            [ $type, $val ] = explode("|", $this->cache->get($key));
            return match ($type) {
                'int' => intval($val),
                'null' => null,
                default => $val,
            };
        } catch (ItemNotInCacheException) {
            $docData = $this->getDocumentEntityData($docId);
            $val = $docData->getObjectForPredicate($predicate);
            $type = 'string';
            if (is_int($val)) {
                $type = 'int';
            }
            if (is_null($val)) {
                $type = 'null';
            }
            $this->cache->set($key, implode("|", [ $type, $val ]), self::MemoryCacheTtl);
            return $val;
        }

    }

    /**
     * Returns true if the document is DeepZoom
     *
     * @throws DocumentNotFoundException
     */
    public function isDocDeepZoom(int $docId): bool {
        return ValueToolBox::valueToBool($this->getDocAttribute($docId, Entity::pUseDeepZoomForImages));
    }


    /**
     * @inheritDoc
     */
    public function getLegacyDocInfo(int $docId): array
    {
        // notice that there's no caching here, unlike the original DataManager function
        // caching is already embedded into the entity system
        $docEntityData = $this->getDocumentEntityData($docId);

        return [
            'id' => $docEntityData->id,
            'tid' => $docEntityData->id,
            'title' => $docEntityData->name,
            'lang' => $docEntityData->getObjectForPredicate(Entity::pDocumentLanguage),
            'doc_type' => $docEntityData->getObjectForPredicate(Entity::pDocumentType),
            'image_source' => $docEntityData->getObjectForPredicate(Entity::pImageSource),
            'image_source_data' => $docEntityData->getObjectForPredicate(Entity::pImageSourceData),
            'deep_zoom' => ValueToolBox::valueToBool($docEntityData->getObjectForPredicate(Entity::pUseDeepZoomForImages)),
        ];
    }

    /**
     * @inheritDoc
     */
    public function getDocInfo(int $docId, bool $includePageIds = false) : DocInfo {
        $docEntityData = $this->getDocumentEntityData($docId);
        $docInfo = new DocInfo();
        $docInfo->setFromEntityData($docEntityData);

        if ($includePageIds) {
            $docInfo->pageIds = $this->getPageArray($docId, self::ORDER_BY_PAGE_NUMBER, self::PAGE_ARRAY_IDS);
        }
        return $docInfo;
    }

}