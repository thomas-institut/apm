<?php


namespace APM\Api;


use APM\EditionEngine\BasicAutomaticEditionEngine;
use APM\EditionEngine\EditionEngine;
use APM\Engine\Engine;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiEditionEngine extends ApiController
{

    const API_ERROR_ENGINE_ERROR = 4001;

    /**
     * @param Request $request
     * @param Response $response
     * @return array|Response
     */
    public function automaticEditionEngine(Request $request,  Response $response)
    {

        $apiCall = 'EditionEngine';
        $requiredFields = [
            EditionEngine::INPUT_FIELD_COLLATION_TABLE,
            EditionEngine::INPUT_FIELD_BASE_SIGLUM,
        ];

        $inputDataObject = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }
        $this->profiler->start();

        // TODO: implement this!

        $this->profiler->stop();
        $this->logProfilerData('editionEngine');

        return $this->responseWithJson($response, [
            'engineDetails' => [ 'error' => "Not implemented yet"],
            'edition' => []
        ]);
    }

}