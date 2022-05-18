<?php


namespace APM\Api;

use Monolog\Logger;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiLog extends ApiController
{
    public const SEVERITY_ERROR = 'error';
    public const SEVERITY_INFO = 'info';
    public const SEVERITY_DEBUG = 'debug';
    public const SEVERITY_WARNING = 'warning';

    private $frontEndLogger;


    public function __construct(ContainerInterface $ci)
    {
        parent::__construct($ci);
        $this->frontEndLogger = $this->logger->withName('FRONT_END');
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return array|Response
     */
    public function frontEndLog(Request $request,  Response $response)
    {

        $apiCall = 'frontEndLog';
        $requiredFields = [
            'module',
            'subModule',
            'severity',
            'description',
            'data'
        ];

        $inputDataObject = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }

        $logLevel = Logger::INFO;
        switch($inputDataObject['severity']) {
            case self::SEVERITY_DEBUG:
                $logLevel = Logger::DEBUG;
                break;

            case self::SEVERITY_ERROR:
                $logLevel = Logger::ERROR;
                break;

            case self::SEVERITY_INFO:
                $logLevel = Logger::INFO;
                break;

            case self::SEVERITY_WARNING:
                $logLevel = Logger::WARNING;
                break;
        }

        $inputDataObject['data']['apiUserId'] = $this->apiUserId;

        $logMessage = sprintf("%s:%s : %s", $inputDataObject['module'], $inputDataObject['subModule'], $inputDataObject['description']);

        $this->frontEndLogger->log($logLevel, $logMessage, $inputDataObject['data']);
        return $this->responseWithText($response, 'OK');
    }

}