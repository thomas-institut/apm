<?php

namespace APM\Api;

use APM\EntitySystem\Schema\Entity;
use APM\System\Person\PersonNotFoundException;
use APM\System\Work\WorkNotFoundException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiWorks extends ApiController
{

    const CLASS_NAME = 'Works';

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
                [ 'apiUserId' => $this->apiUserTid,
                    'workId' => $workId]);
            return $this->responseWithStatus($response, 409);
        }
        try {
            $authorName = $this->systemManager->getPersonManager()->getPersonEssentialData($workData->authorTid)->name;
        } catch (PersonNotFoundException) {
            $this->logger->error("Author not found " . $workData->authorTid);
            $authorName = '';
        }

        $workInfo = [
            'id' => $workData->tid,
            'tid' => $workData->tid,
            'dare_id' => $workData->dareId,
            'author_tid'=> $workData->authorTid,
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
                    [ 'apiUserId' => $this->apiUserTid,
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

        $chunks = $this->systemManager->getDataManager()->getChunksWithTranscriptionForWorkId($workId);

        return $this->responseWithJson($response, [
           'workId' => $workId,
           'chunks' => $chunks
        ]);
    }


}