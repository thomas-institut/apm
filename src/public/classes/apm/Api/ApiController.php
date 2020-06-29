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

namespace APM\Api;

use APM\CollationEngine\CollationEngine;
use APM\System\ApmConfigParameter;
use APM\System\ApmContainerKey;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ResponseInterface as Response;
use \Psr\Http\Message\ServerRequestInterface as Request;

use AverroesProject\Data\DataManager;
use APM\System\SystemManager;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Slim\Routing\RouteParser;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\Profiler\SimpleProfiler;
use ThomasInstitut\Profiler\TimeTracker;

/**
 * API Controller class
 *
 */
abstract class ApiController implements LoggerAwareInterface, CodeDebugInterface
{

    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;

    /**
     *
     * @var SystemManager 
     */
    protected $systemManager;


    /**
     * @var int
     */
    protected $apiUserId;

    /**
     * @var SimpleProfiler
     */
    protected $profiler;
    
    // Error codes
    const API_ERROR_NO_DATA = 1000;
    const API_ERROR_NO_ELEMENT_ARRAY = 1001;
    const API_ERROR_NO_EDNOTES = 1002;
    const API_ERROR_ZERO_ELEMENTS = 1003;
    const API_ERROR_MISSING_ELEMENT_KEY = 1004;
    const API_ERROR_WRONG_PAGE_ID = 1005;
    const API_ERROR_WRONG_COLUMN_NUMBER = 1006;
    const API_ERROR_WRONG_EDITOR_ID = 1007;
    const API_ERROR_EMPTY_ELEMENT = 1008;
    const API_ERROR_MISSING_ITEM_KEY = 1009;
    const API_ERROR_DUPLICATE_ITEM_ID = 1010;
    const API_ERROR_MISSING_EDNOTE_KEY = 1011;
    const API_ERROR_WRONG_TARGET_FOR_EDNOTE = 1012;
    const API_ERROR_WRONG_AUTHOR_ID = 1013;
    const API_ERROR_WRONG_DOCUMENT = 1014;
    const API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED = 1015;
    const API_ERROR_COLLATION_ENGINE_ERROR = 1016;
    const API_ERROR_MISSING_REQUIRED_FIELD = 1017;
    
    const API_ERROR_NOT_AUTHORIZED  = 1100;
    
    const API_ERROR_DB_UPDATE_ERROR = 1200;
    
    const API_ERROR_WRONG_TYPE = 1300;

    /**
     * @var array
     */
    protected $languages;


    /**
     * @var ContainerInterface
     */
    private $container;

    /**
     * @var bool
     */
    private $debugMode;
    /**
     * @var string
     */
    private $dataManager;

    /**
     * @var RouteParser
     */
    protected $router;


    /**
     * ApiController constructor.
     * @param ContainerInterface $ci
     */
    public function __construct(ContainerInterface $ci)
    {
       $this->container = $ci;
       $this->debugMode = true;

       $this->systemManager = $ci->get(ApmContainerKey::SYSTEM_MANAGER);
       $this->apiUserId = $ci->get(ApmContainerKey::API_USER_ID); // this should be set by the authenticator!
       $this->languages = $this->systemManager->getConfig()[ApmConfigParameter::LANGUAGES];
       $this->logger = $this->systemManager->getLogger()->withName('API');
       $this->dataManager = $this->systemManager->getDataManager();
       $this->router = $this->systemManager->getRouter();
       $this->profiler = new SimpleProfiler();
       $this->profiler->registerProperty('time', new TimeTracker());
       $this->profiler->registerProperty('mysql-queries', $this->systemManager->getSqlQueryCounterTracker());
       $this->profiler->registerProperty('cache', $this->systemManager->getCacheTracker());
    }

    /**
     * @return DataManager
     */
    protected function getDataManager() : DataManager {
        return $this->dataManager;
    }

    /**
     * @return CollationEngine
     */
    protected function getCollationEngine() : CollationEngine {
        return $this->systemManager->getCollationEngine();
    }


    /**
     * Logs a debug message in the logger
     * @codeCoverageIgnore
     *
     * @param string $msg
     * @param array $data
     */
    protected function debug(string $msg, array $data=[])
    {
        if ($this->debugMode){
            $this->logger->debug($msg, $data);
        }
    }


    /**
     * Checks that the given request contains a 'data' field, which in 
     * turn contains the given $requiredFields. 
     * 
     * If there's any error, returns a Response with the proper error status
     * If everything is OK, returns the input data array
     * 
     * @param Request $request
     * @param Response $response
     * @param string $apiCall
     * @param array $requiredFields
     * @return Response|array
     */
    protected function checkAndGetInputData(Request $request, 
            Response $response, string $apiCall, array $requiredFields) {
        $rawData = $request->getBody()->getContents();
        parse_str($rawData, $postData);
        $inputData = null;
        
        if (isset($postData['data'])) {
            $inputData = json_decode($postData['data'], true);
        }
        
        // Some checks
        if (is_null($inputData) ) {
            $this->logger->error("$apiCall: no data in input",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_NO_DATA,
                      'rawdata' => $postData]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_NO_DATA], 409);
        }
        
        foreach ($requiredFields as $requiredField) {
            if (!isset($inputData[$requiredField])) {
                $this->logger->error("$apiCall: missing required field '$requiredField' in input data",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_MISSING_REQUIRED_FIELD,
                      'rawdata' => $postData]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_MISSING_REQUIRED_FIELD], 409);
            }
        }
        
        return $inputData;
    }

    /**
     * @param Response $response
     * @param mixed $data
     * @param int $status
     * @return Response
     */
    protected function responseWithJson(ResponseInterface $response, $data, $status = 200) : ResponseInterface {
        $payload = json_encode($data);
        return $this->responseWithJsonRaw($response, $payload, $status);
    }

    /**
     * @param Response $response
     * @param $json
     * @param int $status
     * @return Response
     */
    protected function responseWithJsonRaw(ResponseInterface $response, $json, $status = 200) : ResponseInterface {
        $response->getBody()->write($json);

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }


    protected function logProfilerData(string $pageTitle) : void
    {
        $lapInfo = $this->profiler->getLaps();
        $totalTimeInMs = $this->getProfilerTotalTime() * 1000;
        $totalQueries = $lapInfo[count($lapInfo)-1]['mysql-queries']['cummulative']['Total'];
        $cacheHits = $lapInfo[count($lapInfo)-1]['cache']['cummulative']['hits'];
        $cacheMisses = $lapInfo[count($lapInfo)-1]['cache']['cummulative']['misses'];
        $this->logger->debug(sprintf("PROFILER %s, finished in %0.2f ms, %d MySql queries, %d cache hits, %d misses",
            $pageTitle, $totalTimeInMs, $totalQueries, $cacheHits, $cacheMisses), $lapInfo);
    }

    protected function getProfilerTotalTime() : float
    {
        $lapInfo = $this->profiler->getLaps();
        return $lapInfo[count($lapInfo)-1]['time']['cummulative'];
    }

    protected function responseWithText(Response $response, string $text, int $status=200) : Response {
        $response->getBody()->write($text);
        return $response->withStatus($status);
    }
}
