<?php


namespace APM\Api;


use APM\EditionEngine\BasicAutomaticEditionEngine;
use APM\EditionEngine\BasicEditionEngine2;
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
            'collationTable',
        ];

        $inputDataObject = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }
        $this->profiler->start();

        $editionEngine = new BasicEditionEngine2('BasicEditionEngine2');

        $responseData = $editionEngine->generateEdition($inputDataObject);

        $responseData['engineRunDetails'] = $editionEngine->getRunDetails();

        $this->profiler->stop();
        $this->logProfilerData('editionEngine');

        return $this->responseWithJson($response, $responseData);
    }

}