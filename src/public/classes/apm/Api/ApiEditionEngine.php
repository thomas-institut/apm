<?php


namespace APM\Api;


use APM\EditionEngine\BasicEditionEngine;
use APM\EditionEngine\EditionEngine;
use AverroesProject\Profiler\ApmProfiler;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiEditionEngine extends ApiController
{
    public function basicEditionEngine(Request $request,
                                       Response $response, $next)
    {
        $db = $this->db;
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
        $profiler = new ApmProfiler("EditionEngine", $db);

        $engine = new BasicEditionEngine();

        $edition = $engine->generateEdition($inputDataObject);

        $profiler->log($this->logger);

        return $response->withJson([
            'engineDetails' => $engine->getRunDetails(),
            'edition' => $edition
        ]);
    }

}