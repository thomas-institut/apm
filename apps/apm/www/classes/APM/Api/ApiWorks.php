<?php

namespace APM\Api;

use APM\CollationTable\CollationTableManager;
use APM\Site\SiteWorks;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Person\PersonManagerInterface;
use APM\System\Person\PersonNotFoundException;
use APM\System\Transcription\TranscriptionManager;
use APM\System\Work\WorkManager;
use APM\System\Work\WorkNotFoundException;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiWorks extends ApiController
{

    const string CLASS_NAME = 'Works';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function getWorkInfoOld(Request $request, Response $response): Response
    {
        $workId =  $request->getAttribute('workId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $workId);
        $workManager = $this->container->get(WorkManager::class);
        $personManager = $this->container->get(PersonManagerInterface::class);
        try {
            $workData = $workManager->getWorkDataByDareId($workId);
        } catch (WorkNotFoundException) {
            $this->logger->error("Work '$workId' not found",
                [ 'apiUserId' => $this->apiUserId,
                    'workId' => $workId]);
            return $this->responseWithStatus($response, 409);
        }
        try {
            $authorName = $personManager->getPersonEssentialData($workData->authorId)->name;
        } catch (PersonNotFoundException) {
            $this->logger->error("Author not found " . $workData->authorId);
            $authorName = '';
        }

        $workInfo = [
            'id' => $workData->entityId,
            'tid' => $workData->entityId,
            'dare_id' => $workData->workId,
            'author_tid'=> $workData->authorId,
            'title' => $workData->title,
            'short_title' => $workData->title,
            'enabled' => $workData->enabled ? 1 : 0,
            'author_name' => $authorName,
        ];
        return $this->responseWithJson($response, $workInfo);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function getWorkData(Request $request, Response $response): Response
    {
        $workId =  $request->getAttribute('workId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $workId);
        /** @var WorkManager $workManager */
        $workManager = $this->container->get(WorkManager::class);
        try {
            return $this->responseWithJson($response, $workManager->getWorkDataByDareId($workId)->getExportObject());
        } catch(WorkNotFoundException) {
            try {
                return $this->responseWithJson($response, $workManager->getWorkData(intval($workId))->getExportObject());
            } catch (WorkNotFoundException) {
                $this->logger->error("Work '$workId' not found",
                    [ 'apiUserId' => $this->apiUserId,
                        'workId' => $workId]);
                return $this->responseWithStatus($response, 409);
            }
        }
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function getAuthorList(Request $request, Response $response): Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ );
        /** @var WorkManager $workManager */
        $workManager = $this->container->get(WorkManager::class);
        return $this->responseWithJson($response, $workManager->getAuthors());
    }


    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * TODO: move the data fetching out of the SiteWorks controller
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function allWorksData(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ );
        $collationTableManager = $this->container->get(CollationTableManager::class);
        $transcriptionManager = $this->container->get(TranscriptionManager::class);
        $workManager = $this->container->get(WorkManager::class);
        $systemMainDataCache = $this->container->get(SystemMainDataCache::class);
        return $this->responseWithJson($response,  SiteWorks::getAllWorksData($collationTableManager, $transcriptionManager, $workManager, $systemMainDataCache, $this->logger));
    }


    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function getChunksWithTranscription(Request $request, Response $response): Response
    {
        $workId =  $request->getAttribute('workId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $workId);

        /** @var TranscriptionManager $transcriptionManager */
        $transcriptionManager = $this->container->get(TranscriptionManager::class);

        $chunks = $transcriptionManager->getChunksWithTranscriptionForWorkId($workId);

        return $this->responseWithJson($response, [
           'workId' => $workId,
           'chunks' => $chunks
        ]);
    }


}