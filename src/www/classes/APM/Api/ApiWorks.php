<?php

namespace APM\Api;

use APM\System\Person\PersonNotFoundException;
use APM\System\Work\WorkNotFoundException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiWorks extends ApiController
{

    const string CLASS_NAME = 'Works';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getWorkInfoOld(Request $request, Response $response): Response
    {
        $workId =  $request->getAttribute('workId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $workId);
        $workManager = $this->systemManager->getWorkManager();
        try {
            $workData = $workManager->getWorkDataByDareId($workId);
        } catch (WorkNotFoundException) {
            $this->logger->error("Work '$workId' not found",
                [ 'apiUserId' => $this->apiUserId,
                    'workId' => $workId]);
            return $this->responseWithStatus($response, 409);
        }
        try {
            $authorName = $this->systemManager->getPersonManager()->getPersonEssentialData($workData->authorId)->name;
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
     */
    public function getWorkData(Request $request, Response $response): Response
    {
        $workId =  $request->getAttribute('workId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $workId);
        $workManager = $this->systemManager->getWorkManager();
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
     */
    public function getAuthorList(Request $request, Response $response): Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ );
        return $this->responseWithJson($response, $this->systemManager->getWorkManager()->getAuthors());
    }



    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getChunksWithTranscription(Request $request, Response $response): Response
    {
        $workId =  $request->getAttribute('workId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $workId);

        $chunks = $this->systemManager->getTranscriptionManager()->getChunksWithTranscriptionForWorkId($workId);

        return $this->responseWithJson($response, [
           'workId' => $workId,
           'chunks' => $chunks
        ]);
    }


}