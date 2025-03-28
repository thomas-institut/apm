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
use APM\SystemProfiler;
use APM\System\ApmContainerKey;
use APM\ToolBox\HttpStatus;
use Exception;
use PHPUnit\Framework\Attributes\CodeCoverageIgnore;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

use APM\System\SystemManager;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Slim\Interfaces\RouteParserInterface;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\EntitySystem\Tid;

/**
 * API Controller class
 *
 */
abstract class ApiController implements LoggerAwareInterface, CodeDebugInterface
{

    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;


    /**
     * Class Name for reporting purposes
     */
    const CLASS_NAME = 'Api';

    // Error codes
    const int API_ERROR_RUNTIME_ERROR = 1;
    const int API_ERROR_BAD_REQUEST = 3;
    const int API_ERROR_NO_DATA = 1000;
    const int API_ERROR_NO_ELEMENT_ARRAY = 1001;
    const int API_ERROR_NO_EDNOTES = 1002;
    const int API_ERROR_ZERO_ELEMENTS = 1003;
    const int API_ERROR_MISSING_ELEMENT_KEY = 1004;
    const int API_ERROR_WRONG_PAGE_ID = 1005;
    const int API_ERROR_WRONG_COLUMN_NUMBER = 1006;
    const int API_ERROR_WRONG_EDITOR_ID = 1007;
    const int API_ERROR_EMPTY_ELEMENT = 1008;
    const int API_ERROR_MISSING_ITEM_KEY = 1009;
    const int API_ERROR_DUPLICATE_ITEM_ID = 1010;
    const int API_ERROR_MISSING_EDNOTE_KEY = 1011;
    const int API_ERROR_WRONG_TARGET_FOR_EDNOTE = 1012;
    const int API_ERROR_WRONG_AUTHOR_ID = 1013;
    const int API_ERROR_WRONG_DOCUMENT = 1014;
    const int API_ERROR_COLLATION_ENGINE_ERROR = 1016;
    const int API_ERROR_MISSING_REQUIRED_FIELD = 1017;
    const int API_ERROR_NOT_AUTHORIZED  = 1100;
    const int API_ERROR_DB_UPDATE_ERROR = 1200;
    const int API_ERROR_WRONG_TYPE = 1300;

    protected SystemManager $systemManager;
    protected array $languages;
    protected RouteParserInterface $router;

    private ContainerInterface $container;
    protected bool $debugMode;
    protected string $apiCallName;
    protected int $apiUserId;


    /**
     * ApiController constructor.
     * @param ContainerInterface $ci
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci)
    {
       $this->container = $ci;
       $this->debugMode = false;

       $this->systemManager = $ci->get(ApmContainerKey::SYSTEM_MANAGER);
       $this->apiUserId = $ci->get(ApmContainerKey::API_USER_ID); // this should be set by the authenticator!
       $this->languages = $this->systemManager->getConfig()['languages'];
       $this->logger = $this->systemManager->getLogger()->withName('API');
       $this->router = $this->systemManager->getRouter();
       $this->apiCallName = self::CLASS_NAME . ":generic";
    }
    
    protected function setApiCallName(string $name) : void {
        $this->apiCallName  = $name;
    }

    /**
     * @return CollationEngine
     */
    protected function getCollationEngine() : CollationEngine {
        return $this->systemManager->getCollationEngine();
    }


    /**
     * Logs a debug message in the logger
     *
     * @param string $msg
     * @param array $data
     */
    #[CodeCoverageIgnore] protected function debug(string $msg, array $data=[]): void
    {
        if ($this->debugMode){
            $this->logger->debug($msg, $data);
        }
    }

    protected function info(string $msg, array $data=[]): void
    {
        $this->logger->info($msg, $data);
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
     * @param array $requiredFields
     * @param bool $errorIfEmpty
     * @param bool $useRawData
     * @return Response|array
     */
    protected function checkAndGetInputData(Request  $request,
                                            Response $response, array $requiredFields, bool $errorIfEmpty = false, bool $useRawData = false): array|Response
    {

        $postData = $request->getParsedBody();
//        $this->logger->debug("Post data keys: " . implode(', ', array_keys($postData)));
        if ($useRawData) {
            $inputData = $postData;
        } else {
            if (!isset($postData['data']) ) {
                $this->logger->error("$this->apiCallName: no data in input",
                    [ 'apiUserId' => $this->apiUserId,
                        'apiUserIdString' => Tid::toBase36String($this->apiUserId),
                        'apiError' => self::API_ERROR_NO_DATA,
                        'rawData' => $postData]);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_NO_DATA], HttpStatus::BAD_REQUEST);
            }
            $inputData = json_decode($postData['data'], true);
            if (is_null($inputData)) {
                $this->logger->error("$this->apiCallName: bad JSON in data",
                    [ 'apiUserId' => $this->apiUserId,
                        'apiUserIdString' => Tid::toBase36String($this->apiUserId),
                        'apiError' => self::API_ERROR_NO_DATA,
                        'rawData' => $postData]);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_NO_DATA], HttpStatus::BAD_REQUEST);
            }
        }

        foreach ($requiredFields as $requiredField) {
            if (!isset($inputData[$requiredField]) || ($errorIfEmpty && $inputData[$requiredField] === '')) {
                $this->logger->error("$this->apiCallName: missing required field '$requiredField' in input data",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiUserIdString' => Tid::toBase36String($this->apiUserId),
                      'apiError' => self::API_ERROR_MISSING_REQUIRED_FIELD,
                      'rawData' => $postData]);
            return $this->responseWithJson($response, [
                'error' => self::API_ERROR_MISSING_REQUIRED_FIELD,
                'errorMsg' => "Required $requiredField not given"
            ], HttpStatus::BAD_REQUEST);
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
    protected function responseWithJson(ResponseInterface $response, mixed $data, int $status = 200) : ResponseInterface {
        $payload = json_encode($data);
        return $this->responseWithRawJson($response, $payload, $status);
    }

    /**
     * @param Response $response
     * @param string $json
     * @param int $status
     * @return Response
     */
    protected function responseWithRawJson(ResponseInterface $response, string $json, int $status = 200) : ResponseInterface {

        $this->logProfilers("Response with JSON ready");
        $response->getBody()->write($json);
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    protected function responseWithText(Response $response, string $text, int $status=200) : Response {
        $lapName = $text === '' ? 'Response ready' : 'Response with text ready';
        $this->logProfilers($lapName);
        if ($text !== '') {
            $response->getBody()->write($text);
        }
        return $response->withStatus($status);
    }

    protected function responseWithStatus(Response $response, int $status) : Response{
        return $this->responseWithText($response, '', $status);
    }

    protected function logProfilers(string $endLapName): void
    {
        SystemProfiler::lap($endLapName);
        $this->logger->debug(
            sprintf("API PROFILER %s Finished in %.3f ms", $this->apiCallName, SystemProfiler::getTotalTimeInMs()),
            SystemProfiler::getLaps());
    }

    protected function logException(Exception $e, $msg): void
    {
        $this->logger->error("Exception caught: $msg", [
            'errorMsg' => $e->getMessage(),
            'errorCode' => $e->getCode(),
            'trace' => $e->getTraceAsString()]);
    }


}
