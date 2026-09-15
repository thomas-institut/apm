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

namespace APM\Api;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Schema\Entity;
use APM\System\Actions\PageUpdateDefinition;
use APM\System\Actions\UpdatePageSettingsBulk\UpdatePageSettingsBulkAction;
use APM\System\Actions\UpdatePageSettingsBulk\UpdatePageSettingsBulkPayload;
use APM\System\ApmImageType;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Transcription\TranscriptionManager;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\ToolBox\HttpStatus;
use Exception;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;


/**
 * API Controller class
 *
 */
class ApiDocuments extends ApiController
{

    const string CLASS_NAME = 'Documents';

    const string DOCUMENT_DATA_CACHE_KEY = 'ApiDocuments-DocumentData';
    const int DOCUMENT_DATA_TTL = 8 * 24 * 3600;


    /**
     * Returns data for all the documents in the system
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function allDocumentsData(Request $request, Response $response): Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        /** @var SystemMainDataCache $cache */
        $cache = $this->container->get(SystemMainDataCache::class);
        try {
            $data = json_decode($cache->get(self::DOCUMENT_DATA_CACHE_KEY), true);
        } catch (ItemNotInCacheException) {
            // not in cache
            $this->logger->debug("Cache miss for ApiDocuments document data");
            $data = self::buildDocumentData($this->container);
            $cache->set(self::DOCUMENT_DATA_CACHE_KEY, json_encode($data), self::DOCUMENT_DATA_TTL);
        }

        return $this->responseWithJson($response,  $data['docs']);
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    static public function buildDocumentData(ContainerInterface $container): array
    {
        $docs = [];

        /** @var ApmEntitySystemInterface $apmEntitySystem */
        $apmEntitySystem = $container->get(ApmEntitySystemInterface::class);

        /** @var LoggerInterface $logger */
        $logger = $container->get(LoggerInterface::class);

        $docIds = $apmEntitySystem->getAllEntitiesForType(Entity::tDocument);
        foreach ($docIds as $docId) {
            try {
                $docs[] = self::getDocData($docId, $container);
            } catch (DocumentNotFoundException $e) {
                // should never happen
                $logger->error("Document not found: " . $e->getMessage());
                continue;
            }
        }

        return ['docs' => $docs];
    }

    /**
     * @throws NotFoundExceptionInterface
     * @throws DocumentNotFoundException
     * @throws ContainerExceptionInterface
     */
    static private function getDocData(int $docId, ContainerInterface $container): array
    {
        /** @var DocumentManager $docManager */
        $docManager = $container->get(DocumentManager::class);

        /** @var TranscriptionManager $txManager */
        $txManager = $container->get(TranscriptionManager::class);

        $legacyDocId = $docManager->getLegacyDocId($docId);
        $doc = [];
        $doc['numPages'] = $docManager->getDocPageCount($docId);
        $transcribedPages = $txManager->getTranscribedPageListByDocId($legacyDocId);
        $doc['numTranscribedPages'] = count($transcribedPages);
        $doc['transcribers'] = $txManager->getEditorIdsByDocId($legacyDocId);
        $doc['docInfo'] = $docManager->getLegacyDocInfo($docId);
        $doc['id'] = $docId;
        return $doc;
    }

    /**
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    public static function updateDataCache(ContainerInterface $container, array $docIds): bool
    {

        /** @var SystemMainDataCache $cache */
        $cache = $container->get(SystemMainDataCache::class);

        /** @var LoggerInterface $logger */
        $logger = $container->get(LoggerInterface::class);

        $data = [];
        $completeRebuild = false;
        if (count($docIds) !== 0) {
            try {
                $data = json_decode($cache->get(self::DOCUMENT_DATA_CACHE_KEY), true);
            } catch (ItemNotInCacheException) {
                $completeRebuild = true;
            }
        }
        if ($completeRebuild || count($docIds) === 0) {
            // redo the whole thing!
            $logger->info("Rebuilding document data cache entirely");
            try {
                $data = self::buildDocumentData($container);
            } catch (Exception $e) {
                $logger->error("Exception while building DocumentData",
                    [
                        'code' => $e->getCode(),
                        'msg' => $e->getMessage()
                    ]);
                return false;
            }
        }

        if (count($docIds) !== 0) {
            $updatedDocs = [];

            // updating existing docs
            foreach ($data['docs'] as $docData) {
                if (in_array($docData['id'], $docIds)) {
                    try {
                        $newDocData = self::getDocData($docData['id'], $container);
                    } catch (DocumentNotFoundException) {
                        // a deleted document!
                        // nothing to do
                        continue;
                    }
                    $logger->info("Updating doc data for doc {$docData['id']}");
                    $updatedDocs[] = $newDocData;
                } else {
                    $updatedDocs[] = $docData;
                }
            }

            // adding new
            foreach ($docIds as $docId) {
                if (!in_array($docId, array_column($updatedDocs, 'id'))) {
                    $logger->info("Adding doc data for new doc $docId");
                    try {
                        $newDocData = self::getDocData($docId, $container);
                    } catch (DocumentNotFoundException) {
                        // a deleted document!
                        // nothing to do
                        continue;
                    }
                    $updatedDocs[] = $newDocData;
                }
            }
            $data['docs'] = $updatedDocs;
        }

        if (count($data) !== 0) {
            $cache->set(self::DOCUMENT_DATA_CACHE_KEY, json_encode($data), self::DOCUMENT_DATA_TTL);
        }

        return true;
    }

    /**
     * Returns the "true" docId, which the entity id
     * for a given docId that might an old database id
     *
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getDocId(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $givenDocId = intval($request->getAttribute('docId'));

        if ($givenDocId < 1) {
            return $this->responseWithJson($response, [
                'error' => "Invalid document Id"
            ], HttpStatus::BAD_REQUEST);
        }

        if ($givenDocId > 2000) {
            // for sure this the given id is not a database id,
            // so just return it, no need to query anything
            return $this->responseWithJson($response, [
                'givenDocId' => $givenDocId,
                'docId' => $givenDocId
            ]);
        }

        // this info can be cached forever, it will never change
        $cacheKey = implode(':', [ 'ApiDocuments', 'docId',  $givenDocId ]);

        try {
            $docId = intval($this->systemManager->getSystemDataCache()->get($cacheKey));
            return $this->responseWithJson($response, [
                'givenDocId' => $givenDocId,
                'docId' => $docId,
            ]);
        }  catch (ItemNotInCacheException) {
            // keep going
        }

        try {
            $docInfo = $this->systemManager->getDocumentManager()->getDocInfo($givenDocId);
        } catch (DocumentNotFoundException) {
            return $this->responseWithJson($response, [
                'error' => "Document not found"
            ], HttpStatus::NOT_FOUND);
        }
        $this->systemManager->getSystemDataCache()->set($cacheKey, $docInfo->id, 0);

        return $this->responseWithJson($response, [
            'givenDocId' => $givenDocId,
            'docId' => $docInfo->id,
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException
     */
    public function updatePageSettings(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        if ($this->systemManager->getUserManager()->hasTag($this->apiUserId, UserTag::READ_ONLY)) {
            $this->logger->error("User is not authorized to update page settings",
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NOT_AUTHORIZED,
                    ]);
            return $this->responseWithJson($response,
                    ['error' => ApiController::API_ERROR_NOT_AUTHORIZED,
                     'msg' => 'User is not authorized to update page settings'
                    ], 409);
        }
        
        $pageId = (int) $request->getAttribute('pageId');
        $postData = $request->getParsedBody();
        $this->logger->debug("Update page settings, postData", [ $postData]);
        $foliation = $postData['foliation'];
        $type = (int) $postData['type'];
        $lang = intval($postData['lang']);

        try {
            $pageInfo = $this->systemManager->getDocumentManager()->getPageInfo($pageId);
        } catch (PageNotFoundException) {
            $this->logger->info("Page not found", [ 'pageId' => $pageId]);
            return $this->responseWithText($response, "Page not found", HttpStatus::NOT_FOUND);
        }
        $pageInfo->foliation = $foliation;
        $pageInfo->foliationIsSet = true;
        // TODO: check that this values are valid
        $pageInfo->type = $type;
        $pageInfo->lang = $lang;

        try {
            $this->systemManager->getTranscriptionManager()->updatePageSettings($pageId, $pageInfo, $this->apiUserId);
        } catch (Exception $e) {
            $this->logger->error("Can't update page settings for page $pageId: " . $e->getMessage(), get_object_vars($pageInfo));
            return $this->responseWithStatus($response, 409);
        }
        $this->systemManager->onUpdatePageSettings($this->apiUserId, $pageId);
        return $this->responseWithStatus($response, 200);
    }

    public function getPageTypes(Request $request, Response $response): Response
    {
        return $this->responseWithJson($response,
            $this->systemManager->getEntitySystem()->getAllEntitiesForType(Entity::tPageType));
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function addPages(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $this->debugMode = true;
        $documentManager = $this->systemManager->getDocumentManager();

        $docId = (int) $request->getAttribute('id');
        try {
            $docData = $documentManager->getDocumentEntityData($docId);
        } catch (DocumentNotFoundException) {
            $this->logger->error("Add Pages: document does not exist",
                [ 'apiUserTid' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_WRONG_DOCUMENT,
                    'docId' => $docId ]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_DOCUMENT, 'msg' => 'Document does not exist'], 409);
        }

        
        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        
        
        if (!isset($postData['numPages'])) {
            $this->logger->error("Add pages: no data in input",
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }
        
        $numPages = (int) json_decode($postData['numPages'], true);
        
        if ($numPages === 0) {
            // nothing to do!
            $this->debug("addPages: request for 0 pages, nothing to do");
            return $this->responseWithStatus($response, 200);
        }
        $this->debug("addPages: request for " . $numPages . " new pages");

        try {
            $curNumPages = $documentManager->getDocPageCount($docId);
        } catch (DocumentNotFoundException $e) {
            // should never happen
            $this->logger->error("Document not found getting page count: " . $e->getMessage());
            return $this->responseWithStatus($response, HttpStatus::INTERNAL_SERVER_ERROR);
        }
        $docLang = $docData->getObjectForPredicate(Entity::pDocumentLanguage);

        $this->debug("Doc $docId has $curNumPages pages, creating $numPages more with language $docLang");
        for ($i = $curNumPages; $i < ($numPages+$curNumPages); $i++) {
            try {
                $documentManager->createPage($docId, $i + 1, $docLang);
            } catch (DocumentNotFoundException $e) {
                // should never happen
                $this->logger->error("Document not found creating page: " . $e->getMessage());
                return $this->responseWithStatus($response, HttpStatus::INTERNAL_SERVER_ERROR);
            } catch (Exception $e) {
                $this->logger->error("Add pages: cannot create page",
                    [ 'apiUserTid' => $this->apiUserId,
                        'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                        'curNumPages' => $curNumPages,
                        'requestedNewPages' => $numPages,
                        'pageNumberNotCreated' => $i,
                        'exceptionMessage' => $e->getMessage()
                    ]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_DB_UPDATE_ERROR], 409);
            }
        }

        $this->systemManager->onDocumentUpdated($this->apiUserId, $docId);
        return $this->responseWithStatus($response, 200);
    }

    public function getDocumentInfo(Request $request, Response $response): Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $docId = $request->getAttribute('docId');
        $pageInfoToInclude = $request->getAttribute('pageInfoToInclude', 'none') ;
        if (intval($docId) !== 0) {
            $docId = intval($docId);
        } else {
            $docId = Tid::fromString($docId);
        }

        $this->logger->debug("getDocumentInfo: docId $docId, pageInfoToInclude $pageInfoToInclude");
        $withPages = $pageInfoToInclude !== 'none';
        try {
            $docInfo = $this->systemManager->getDocumentManager()->getDocInfo($docId, $withPages);
        } catch (DocumentNotFoundException $e) {
            $this->logger->error("Document not found getting info: " . $e->getMessage());
            return $this->responseWithStatus($response, HttpStatus::NOT_FOUND);
        }
        $dataToReturn = get_object_vars($docInfo);
        if ($pageInfoToInclude === 'withFullPageInfo') {
            $dataToReturn['pageInfoArray'] = [];

            $docManager = $this->systemManager->getDocumentManager();
            $imageSources = $this->systemManager->getImageSources();
            $transcribedPages = $this->systemManager->getTranscriptionManager()->getTranscribedPageListByDocId($docId);

            foreach($docInfo->pageIds as $pageId) {
                try {
                    $pageInfo = $docManager->getPageInfo($pageId);
                    $pageVars = get_object_vars($pageInfo);

                    $pageVars['isTranscribed'] = in_array($pageInfo->pageNumber, $transcribedPages);
                    $pageVars['thumbnailUrl'] = $docManager->getImageUrl($docId, $pageInfo->pageNumber,
                        ApmImageType::IMAGE_TYPE_JPG_THUMBNAIL, $imageSources);
                    $pageVars['jpgUrl'] = $docManager->getImageUrl($docId, $pageInfo->pageNumber,
                        ApmImageType::IMAGE_TYPE_JPG, $imageSources);

                } catch (PageNotFoundException $e) {
                    // should never happen
                    $this->logger->error("Page not found getting info: " . $e->getMessage());
                    return $this->responseWithStatus($response, HttpStatus::INTERNAL_SERVER_ERROR);
                }
                $dataToReturn['pageInfoArray'][] = $pageVars;
            }
        }
        return $this->responseWithJson($response, $dataToReturn);
    }


    /**
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     * @throws UserNotFoundException
     */
    public function createDocument(Request $request, Response $response, array $args): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        // TODO: implement proper user permissions
        if (!$this->systemManager->getUserManager()->isRoot($this->apiUserId)) {
            $this->logger->warning("Create document: unauthorized request",
                ['apiUserTid' => $this->apiUserId]
            );
            return $this->responseWithStatus($response, 403);
        }

        $inputJson = $request->getBody()->getContents();
        $postData =  json_decode($inputJson, true);

        if (is_null($postData)) {
            $this->logger->error("New Document: no data in input");
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }

        $name = $postData['name'] ?? '';
        $type = $postData['type'] ?? null;
        $lang = $postData['lang'] ?? null;
        $imageSource = $postData['imageSource'] ?? null;
        $imageSourceData = $postData['imageSourceData'] ?? null;

        if ($name === '') {
            $this->logger->error("New Document: no name provided",
                ['apiUserTid' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_NO_DATA,]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }

        $newDocId = $this->systemManager->getDocumentManager()->createDocument($name, $type,
            $lang, $imageSource, $imageSourceData, $this->apiUserId);

        $this->systemManager->onDocumentAdded($this->apiUserId, $newDocId);
        return $this->responseWithJson($response, $newDocId);
    }


    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function updatePageSettingsBulk(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        $inputArray = null;
        if (isset($postData['data'])) {
            $inputArray = json_decode($postData['data'], true);
        }
        if (is_null($inputArray) ) {
            $this->logger->error("Bulk page settings update: no data in input",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }
        
        $pageDefinitions = array_map(fn(array $data) => PageUpdateDefinition::fromArray($data), $inputArray);

        /** @var UpdatePageSettingsBulkAction $action */
        $action = $this->container->get(UpdatePageSettingsBulkAction::class);
        $result = $action->execute(new UpdatePageSettingsBulkPayload($pageDefinitions, $this->apiUserId));

        foreach ($result->updatedPageIds as $pageId) {
            $this->systemManager->onUpdatePageSettings($this->apiUserId, $pageId);
        }

        if ($result->hasErrors()) {
            $this->logger->notice("Bulk page settings update with errors", $result->errors);
        }

        return $this->responseWithJson($response, $result);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getNumColumns(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');

        $docManager = $this->systemManager->getDocumentManager();

        try {
            $numColumns = $docManager->getPageInfo($docManager->getPageIdByDocPage($docId, $pageNumber))->numCols;
        } catch (DocumentNotFoundException|PageNotFoundException $e) {
            $this->logger->info("Doc/Page not found in API call to getNumColumns: $docId:$pageNumber");
            return $this->responseWithStatus($response, HttpStatus::NOT_FOUND);
        }
        $this->info("getNumColumns successful", [ 'docId' => $docId, 'pageNumber' => $pageNumber]);

        return $this->responseWithJson($response, $numColumns);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException
     */
    public function addNewColumn(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');

        if ($this->systemManager->getUserManager()->hasTag($this->apiUserId, UserTag::READ_ONLY)) {
            $this->logger->error("User is not authorized to add new column",
                    [ 'apiUserTd' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NOT_AUTHORIZED,
                    ]);
            return $this->responseWithJson($response,
                    ['error' => ApiController::API_ERROR_NOT_AUTHORIZED,
                     'msg' => 'User is not authorized to add new columns'
                    ], HttpStatus::UNAUTHORIZED);
        }

        $documentManager = $this->systemManager->getDocumentManager();

        try {
            $pageId = $documentManager->getPageIdByDocPage($docId, $pageNumber);
        } catch (PageNotFoundException) {
            // page does not exist
            $this->logger->error("Page not found", ['docId' => $docId, 'pageNumber' => $pageNumber]);
            return $this->responseWithJson($response,
                ['error' => ApiController::API_ERROR_WRONG_PAGE_ID,
                    'msg' => "Page not found, doc $docId page $pageNumber"
                ], HttpStatus::BAD_REQUEST);
        } catch (DocumentNotFoundException) {
            $this->logger->error("Doc not found", ['docId' => $docId, 'pageNumber' => $pageNumber]);
            return $this->responseWithJson($response,
                ['error' => ApiController::API_ERROR_WRONG_DOCUMENT,
                    'msg' => "Doc $docId not found"
                ], HttpStatus::BAD_REQUEST);
        }

        try {
            $documentManager->addColumn($pageId);
        } catch (PageNotFoundException $e) {
            // should never happen!
            $this->logger->error("Runtime Error: " . $e->getMessage(), [ 'docId' => $docId, 'pageNumber' => $pageNumber]);
            return $this->responseWithJson($response,
                ['error' => ApiController::API_ERROR_RUNTIME_ERROR,
                    'msg' => "Server runtime error"
                ], HttpStatus::INTERNAL_SERVER_ERROR);
        }

        try {
            $numColumns = $documentManager->getNumColumns($pageId);
        } catch (PageNotFoundException $e) {
            // should never happen!
            $this->logger->error("Runtime Error: " . $e->getMessage(), [ 'docId' => $docId, 'pageNumber' => $pageNumber]);
            return $this->responseWithJson($response,
                ['error' => ApiController::API_ERROR_RUNTIME_ERROR,
                    'msg' => "Server runtime error"
                ], HttpStatus::INTERNAL_SERVER_ERROR);
        }

        $this->logger->info("User $this->apiUserId added one column to page $pageId", [ 'docId' => $docId, 'pageNumber' => $pageNumber]);
        return $this->responseWithJson($response, $numColumns);
   }

   public function getPageInfo(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $pageId = $request->getAttribute('pageId');

       try {
           $pageInfo = $this->systemManager->getDocumentManager()->getPageInfo($pageId);
       } catch (PageNotFoundException $e) {
           $this->logger->error("Page not found", ['pageId' => $pageId]);
           return $this->responseWithJson($response,
               ['error' => ApiController::API_ERROR_WRONG_PAGE_ID,
                   'msg' => "Page $pageId not found "
               ], HttpStatus::BAD_REQUEST);
       }
       return $this->responseWithJson($response, get_object_vars($pageInfo));
   }

    /**
     * Returns page information for a list of pages identified by page id
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getPageInfoBulk(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        $inputData = $this->checkAndGetInputData($request, $response, ['pages']);
        if (!is_array($inputData)) {
            return $inputData;
        }

        $returnData = [];

        for($i = 0; $i<count($inputData['pages']); $i++) {
            $pageId = $inputData['pages'][$i];
            try {
                $pageInfo = $this->systemManager->getDocumentManager()->getPageInfo($pageId);
            } catch (PageNotFoundException $e) {
                    $this->logger->error("Page $pageId not found", [ 'errorMsg' => $e->getMessage(), 'errorCode' ]);
                    return $this->responseWithText($response,"Page $pageId not found", HttpStatus::NOT_FOUND);
            } catch (RuntimeException $e) {
                $this->logException($e, "Generic Exception from getPageInfoById, page $pageId");
                return $this->responseWithText($response, "Server error", HttpStatus::INTERNAL_SERVER_ERROR);
            }
            $returnData[] = [
                'id' => $pageId,
                'docId' => $pageInfo->docId,
                'pageNumber' => $pageInfo->pageNumber,
                'seq' => $pageInfo->sequence,
                'numCols' => $pageInfo->numCols,
                'foliation' => $pageInfo->foliation
            ];
        }
        return $this->responseWithJson($response, $returnData);
    }
   
}
