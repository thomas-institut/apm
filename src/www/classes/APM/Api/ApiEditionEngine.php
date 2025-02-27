<?php


namespace APM\Api;

use APM\EditionEngine\BasicEditionEngine;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiEditionEngine extends ApiController
{

    const CLASS_NAME = 'EditionEngine';

//    const API_ERROR_ENGINE_ERROR = 4001;

    /**
     * @param Request $request
     * @param Response $response
     */
    public function automaticEditionEngine(Request $request,  Response $response) : Response
    {

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $requiredFields = [
            'collationTable',
        ];

        $inputDataObject = $this->checkAndGetInputData($request, $response, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }

        $editionEngine = new BasicEditionEngine('BasicEditionEngine2');

        $responseData = $editionEngine->generateEdition($inputDataObject);

        $responseData['engineRunDetails'] = $editionEngine->getRunDetails();

        return $this->responseWithJson($response, $responseData);
    }

}