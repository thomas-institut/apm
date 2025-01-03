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
use Exception;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use RuntimeException;
use ThomasInstitut\DataCache\EntityNotInCacheException;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\NoExpireInMemoryPhpVarCache;
use ThomasInstitut\DataCache\PhpVarCacheEntityDataCache;
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
    private PhpVarCacheEntityDataCache $entityCache;

    public function __construct(callable $getEntitySystem, callable $getPagesDataTable)
    {
        $this->getEntitySystem = $getEntitySystem;
        $this->getPagesDataTable = $getPagesDataTable;
        $this->logger = new NullLogger();
        $this->debug = true;
        $this->entityCache = new PhpVarCacheEntityDataCache(new NoExpireInMemoryPhpVarCache());
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
        return $this->getLegacyPageInfo($pageId)['num_columns'];
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


    private function getLegacyPageInfoFromDbRow(array $row): array {
        // Sanitize types!
        $row['page_number'] = intval($row['page_number']);
        $row['seq'] = intval($row['seq']);
        $row['num_cols'] = intval($row['num_cols']);
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
        try {
            $dbId = $this->entityCache->getObject($data->id, Entity::pLegacyApmDatabaseId);
        } catch (EntityNotInCacheException $e) {
            // should never happen, we just got the data
            throw new RuntimeException("Cache exception getting doc dbId: " . $e->getMessage(), 0, $e);
        }
        return $dbId !== null ? $dbId : $docId;
    }


    /**
     * @inheritDoc
     */
    public function updatePageSettings(int $pageId, array $settings): void
    {
        if (count(array_keys($settings)) === 0) {
            return;
        }
            // make sure the page exists
        $this->getLegacyPageInfo($pageId);
        $row = [];

        $row['lang'] = $settings['lang'] ?? null;
        $row['foliation'] = $settings['foliation'] ?? null;
        if ($row['foliation'] === '') {
            $row['foliation'] = null;
        }

        $row['type'] = $settings['type'] ?? null;
        if ($row['type'] !== null) {
            if (!$this->checkEntity($row['type'], Entity::tDocumentType)) {
                throw new InvalidArgumentException("Given type '{$row['type']}' is not a valid document type");
            }
        }
        $row['seq'] = $settings['seq'] ?? null;


        $row = array_filter($row, function($v) { return $v !== null;});
        if (count(array_keys($row)) === 0) {
            // nothing to update
            return;
        }
        $row['id'] = $pageId;

        try {
            $this->getPagesDataTable()->updateRow($row);
        } catch (Exception $e) {
            // should never happen
            throw new RuntimeException("Exception updating page: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @inheritDoc
     */
    public function getLegacyDocPageInfoArray(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER): array
    {

        $this->debug && $this->logger->debug("Getting legacy doc page info array for doc $docId",
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

        return array_map(function($row) { return $this->getLegacyPageInfoFromDbRow($row);}, $rows);
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
            } catch (KeyNotInCacheException) {
                $statements = $this->getEntitySystem()->getStatements(null, Entity::pLegacyApmDatabaseId, strval($docId));
                if (count($statements) === 0) {
                    throw new DocumentNotFoundException("Document with legacy docId $docId not found");
                }
                $entityId = $statements[0]->subject;
                $this->cache->set("entity-id-$docId", $entityId);
            }
        }
        // speed things up with a cache
        try {
            return $this->entityCache->getEntityData($entityId);
        } catch (EntityNotInCacheException) {
            try {
                $data = $this->getEntitySystem()->getEntityData($entityId);
                $this->entityCache->storeEntityData($data);
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
        $docData = $this->getDocumentEntityData($docId);
        try {
            return $this->entityCache->getObject($docData->id, $predicate);
        } catch (EntityNotInCacheException $e) {
            // should never happen, we just got the data
            throw new RuntimeException("Cache exception getting doc image source: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Returns true if the document is DeepZoom
     *
     * (caches results to speed things up)
     * @throws DocumentNotFoundException
     */
    private function isDocDeepZoom(int $docId): bool {
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

}