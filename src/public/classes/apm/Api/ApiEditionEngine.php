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
            EditionEngine::FIELD_COLLATION_TABLE,
            EditionEngine::FIELD_SIGLA_ABBREVIATIONS,
            EditionEngine::FIELD_BASE_SIGLUM,
            EditionEngine::FIELD_TEXT_DIRECTION,
            EditionEngine::FIELD_LANGUAGE
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