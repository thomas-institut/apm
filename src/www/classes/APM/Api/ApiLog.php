<?php


namespace APM\Api;

use Monolog\Level;
use Monolog\Logger;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiLog extends ApiController
{
    const CLASS_NAME = 'Log';
    public const SEVERITY_ERROR = 'error';
    public const SEVERITY_INFO = 'info';
    public const SEVERITY_DEBUG = 'debug';
    public const SEVERITY_WARNING = 'warning';

    private Logger $frontEndLogger;


    public function __construct(ContainerInterface $ci)
    {
        parent::__construct($ci);
        $this->frontEndLogger = $this->systemManager->getLogger()->withName('FRONT_END');
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function frontEndLog(Request $request,  Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $requiredFields = [
            'module',
            'subModule',
            'severity',
            'description',
            'data'
        ];

        $inputDataObject = $this->checkAndGetInputData($request, $response, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }

        $logLevel = Level::Info;
        switch($inputDataObject['severity']) {
            case self::SEVERITY_DEBUG:
                $logLevel = Level::Debug;
                break;

            case self::SEVERITY_ERROR:
                $logLevel = Level::Error;
                break;

            case self::SEVERITY_INFO:
                // = the default value
                //$logLevel = Level::Info;
                break;

            case self::SEVERITY_WARNING:
                $logLevel = Level::Warning;
                break;
        }

        $inputDataObject['data']['apiUserTid'] = $this->apiUserTid;
        $logMessage = sprintf("%s:%s : %s", $inputDataObject['module'], $inputDataObject['subModule'], $inputDataObject['description']);
        $this->frontEndLogger->log($logLevel, $logMessage, $inputDataObject['data']);
        return $this->responseWithText($response, 'OK');
    }
}