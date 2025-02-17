<?php


namespace APM\Api;

use APM\System\ApmConfigParameter;
use Monolog\Level;
use Monolog\Logger;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiSystem extends ApiController
{
    const CLASS_NAME = 'System';

    public function __construct(ContainerInterface $ci)
    {
        parent::__construct($ci);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getSystemLanguages(Request $request,  Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        return $this->responseWithJson($response, $this->systemManager->getConfig()['languages']);
    }
}