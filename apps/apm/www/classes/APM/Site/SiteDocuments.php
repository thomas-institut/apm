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

/**
 * Site Documents class
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace APM\Site;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Schema\Entity;
use APM\System\ApmImageType;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use APM\System\Transcription\ApmChunkSegmentLocation;
use APM\System\Transcription\ChunkSegmentLocationStatus;
use APM\System\Transcription\TranscriptionManager;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\ToolBox\HttpStatus;
use Exception;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use RuntimeException;
use Slim\Interfaces\RouteParserInterface;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;

/**
 * SiteDocuments class
 *
 */
class SiteDocuments extends SiteController
{
   /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getDocumentManager(): DocumentManager
    {
        return $this->container->get(DocumentManager::class);
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getRouter(): RouteParserInterface
    {
        return $this->container->get(RouteParserInterface::class);
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getTranscriptionManager(): TranscriptionManager
    {
        return $this->container->get(TranscriptionManager::class);
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getEntitySystem(): ApmEntitySystemInterface
    {
        return $this->container->get(ApmEntitySystemInterface::class);
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getSystemManager() : SystemManager {
        return $this->container->get(SystemManager::class);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     * @throws PersonNotFoundException
     * @throws UserNotFoundException
     */
    public function documentPage(Request $request, Response $response, array $args): Response
    {

        $id = $args['id'];
        $selectedPage = intval($request->getQueryParams()['selectedPage'] ?? '0');
        $docId = $this->getEntitySystem()->getEntityIdFromString($id);

        if ($docId === -1) {
            return $this->getBasicErrorPage($response, "Invalid Document ID",
                "Invalid Document ID $id", HttpStatus::BAD_REQUEST);
        }
        $docIdString = Tid::toBase36String($docId);

        $this->logger->debug("Showing Document Page for Document ID $docId ($docIdString)");

        $chunkSegmentErrorMessages = [];
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::VALID] = '';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::NO_CHUNK_START] = 'No chunk start found';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::NO_CHUNK_END] = 'No chunk end found';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::CHUNK_START_AFTER_END] = 'Chunk start after chunk end';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::DUPLICATE_CHUNK_START_MARKS] = 'Duplicate start marks';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::DUPLICATE_CHUNK_END_MARKS] = 'Duplicate end marks';


        $docManager = $this->getDocumentManager();
        $transcriptionManager = $this->getTranscriptionManager();
        $userManager = $this->getUserManager();
        if ($docId < 2000) {
            // a legacy doc id
            $this->logger->debug("Id $docId is a legacy id");
            try {
                $docData = $docManager->getDocumentEntityData($docId);
            } catch (DocumentNotFoundException $e) {
                $this->logger->debug("Document not found: " . $e->getMessage());
                return $this->getBasicErrorPage($response, "Document $id not found",
                    "Document $id not found", HttpStatus::NOT_FOUND);
            }
            $this->logger->debug("Entity id for legacy doc id $docId is $docData->id");
            $newUrl = $this->getRouter()->urlFor("docPage", ['id' => Tid::toBase36String($docData->id)]);
            $this->logger->warning("Redirecting to $newUrl");
            return $response->withHeader('Location', $newUrl)->withStatus(HttpStatus::MOVED_PERMANENTLY);
        }

        $doc = [];
        try {
            $legacyDocId = $docManager->getLegacyDocId($docId);
            $doc['numPages'] = $docManager->getDocPageCount($docId);
            $pageInfoArray = $docManager->getLegacyDocPageInfoArray($docId);
            $doc['docInfo'] = $docManager->getLegacyDocInfo($docId);
            $transcribedPages = $transcriptionManager->getTranscribedPageListByDocId($legacyDocId);
            $doc['numTranscribedPages'] = count($transcribedPages);
            $doc['pages'] = $this->buildPageArrayNew($pageInfoArray, $transcribedPages, $doc['docInfo']);

            $chunkLocationMap = $transcriptionManager->getChunkLocationMapForDoc($legacyDocId, '');

            $versionMap = $transcriptionManager->getVersionsForChunkLocationMap($chunkLocationMap);
            $lastChunkVersions = $transcriptionManager->getLastChunkVersionFromVersionMap($versionMap);
            $lastSaves = $transcriptionManager->getLastSavesForDoc($legacyDocId, 20);

        } catch (DocumentNotFoundException) {
            return $this->getBasicErrorPage($response, "Document $id not found",
                "Document $id not found", HttpStatus::NOT_FOUND);
        }

        $chunkInfo = [];

        $versionInfo = [];
        $authorInfo = [];

        foreach ($lastSaves as $saveVersionInfo) {
            if (!isset($authorInfo[$saveVersionInfo->authorTid])) {
                $authorInfo[$saveVersionInfo->authorTid] =
                    $this->getPersonManager()->getPersonEssentialData($saveVersionInfo->authorTid);
            }
        }

        // TODO: support different local Ids in chunk list
        foreach ($chunkLocationMap as $workId => $chunkArray) {
            foreach ($chunkArray as $chunkNumber => $docArray) {
                foreach ($docArray as $docIdInMap => $witnessLocalIdArray) {
                    foreach ($witnessLocalIdArray as $witnessLocalId => $segmentArray) {
                        $lastChunkVersion = $lastChunkVersions[$workId][$chunkNumber][$docIdInMap][$witnessLocalId];
                        $versionInfo[$workId][$chunkNumber] = $lastChunkVersion;
                        if ($lastChunkVersion->authorTid !== 0 && !isset($authorInfo[$lastChunkVersion->authorTid])) {
                            $authorInfo[$lastChunkVersion->authorTid] = $this->getPersonManager()->getPersonEssentialData($lastChunkVersion->authorTid);
                        }
                        foreach ($segmentArray as $segmentNumber => $location) {
                            /** @var $location ApmChunkSegmentLocation */
                            if ($location->getStart()->hasNotBeenSet()) {
                                $start = '';
                            } else {
                                try {
                                    $pageInfo = $docManager->getPageInfo($docManager->getPageIdByDocSeq($docId, $location->getStart()->pageSequence));
                                } catch (DocumentNotFoundException|PageNotFoundException $e) {
                                    // should never happen
                                    throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
                                }
                                $start = [
                                    'seq' => $location->getStart()->pageSequence,
                                    'foliation' => $pageInfo->foliation,
                                    'column' => $location->getEnd()->columnNumber,
                                    'numColumns' => $pageInfo->numCols
                                ];
                            }
                            if ($location->getEnd()->hasNotBeenSet()) {
                                $end = '';
                            } else {
                                try {
                                    $pageInfo = $docManager->getPageInfo($docManager->getPageIdByDocSeq($docId, $location->getEnd()->pageSequence));
                                } catch (DocumentNotFoundException|PageNotFoundException $e) {
                                    // should never happen
                                    throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
                                }
                                $end = [
                                    'seq' => $location->getEnd()->pageSequence,
                                    'foliation' => $pageInfo->foliation,
                                    'column' => $location->getEnd()->columnNumber,
                                    'numColumns' => $pageInfo->numCols
                                ];
                            }

                            $chunkInfo[$workId][$chunkNumber][$segmentNumber] =
                                [
                                    'start' => $start,
                                    'end' => $end,
                                    'valid' => $location->isValid(),
                                    'errorCode' => $location->getStatus(),
                                    'errorMsg' => $chunkSegmentErrorMessages[$location->getStatus()]
                                ];
                        }
                    }
                }

            }

        }

        return $this->renderStandardPage(
            $response,
            '',
            "Doc " . $doc['docInfo'][' title'],
            "DocPage",
            'js/pages/DocPage.ts',
            [
                'canDefinePages' => true,
                'canEditDocuments' => $userManager->isUserAllowedTo($this->userId, UserTag::EDIT_DOCUMENTS),
                'doc' => $doc,
                'chunkInfo' => $chunkInfo,
                'versionInfo' => $versionInfo,
                'lastSaves' => $lastSaves,
                'params' => explode('/', $args['params'] ?? ''),
                'selectedPage' => $selectedPage
            ],
        );
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    protected function buildPageArrayNew(array $legacyPageInfoArray, array $transcribedPages, array $legacyDocInfo): array
    {
        $thePages = [];
        $docManager = $this->getDocumentManager();
        $imageSources = $this->getSystemManager()->getImageSources();
        foreach ($legacyPageInfoArray as $legacyPageInfo) {
            try {
                $thePage = $legacyPageInfo;
                $pageNumber = $legacyPageInfo['page_number'];
                $imageNumber = $legacyPageInfo['img_number'];
                $thePage['pageId'] = $legacyPageInfo['id'];
                $thePage['sequence'] = $legacyPageInfo['seq'];
                $thePage['pageNumber'] = $legacyPageInfo['page_number'];
                $thePage['imageNumber'] = $legacyPageInfo['img_number'];
                $thePage['numCols'] = $legacyPageInfo['num_cols'];
                $thePage['imageSource'] = $legacyDocInfo['image_source'];
                $thePage['isDeepZoom'] = $legacyDocInfo['deep_zoom'];
                $thePage['isTranscribed'] = in_array($pageNumber, $transcribedPages);

                $thePage['imageUrl'] = $docManager->getImageUrl($legacyDocInfo['id'],
                    $pageNumber, ApmImageType::IMAGE_TYPE_DEFAULT, $imageSources);
                $thePage['jpgUrl'] = $docManager->getImageUrl($legacyDocInfo['id'],
                    $imageNumber, ApmImageType::IMAGE_TYPE_JPG, $imageSources);
                $thePage['thumbnailUrl'] = $docManager->getImageUrl($legacyDocInfo['id'],
                    $imageNumber, ApmImageType::IMAGE_TYPE_JPG_THUMBNAIL, $imageSources);
//                $this->logger->debug("The page", $thePage);
                $thePages[$legacyPageInfo['id']] = $thePage;
            } catch (DocumentNotFoundException $e) {
                // should never happen
                throw new RuntimeException("Document not found:" . $e->getMessage());
            }
        }
        return $thePages;
    }

}
