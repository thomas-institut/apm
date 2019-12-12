<?php


namespace APM\Api;


use APM\EditionEngine\BasicEditionEngine;
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
    public function basicEditionEngine(Request $request,  Response $response)
    {

        $apiCall = 'EditionEngine';
        $requiredFields = [
            EditionEngine::INPUT_FIELD_COLLATION_TABLE,
            EditionEngine::INPUT_FIELD_SIGLA_ABBREVIATIONS,
            EditionEngine::INPUT_FIELD_BASE_SIGLUM,
            EditionEngine::INPUT_FIELD_TEXT_DIRECTION,
            EditionEngine::INPUT_FIELD_LANGUAGE
        ];

        $inputDataObject = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }
        $this->profiler->start();

        $engine = new BasicEditionEngine();

        $edition = $engine->generateEdition($inputDataObject);

        if ($engine->getErrorCode() !== Engine::ERROR_NOERROR) {
            $this->logger->error("$apiCall: EditionEngine error",
                [ 'apiUserId' => $this->apiUserId,
                    'apiError' => self::API_ERROR_ENGINE_ERROR,
                    'enginerError' => $engine->getErrorCode() . ': ' . $engine->getErrorMessage()]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_ENGINE_ERROR], 409);
        }

        $this->profiler->stop();
        $this->logProfilerData('editionEngine');

        return $this->responseWithJson($response, [
            'engineDetails' => $engine->getRunDetails(),
            'edition' => $edition
        ]);
    }

}