<?php

namespace APM\Site;

use APM\SystemConfig;
use APM\SystemProfiler;
use APM\ToolBox\HttpStatus;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

class SiteSettings extends SiteController
{

    /**
     *
     * Returns a JSON object with the site settings
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getSiteSettings(Request $request, Response $response) : Response {

        SystemProfiler::setName("Site:" . __FUNCTION__);
       $appSettings = SystemConfig::genAppSettings($this->systemManager->getConfig());
       $json = json_encode($appSettings);
       if ($json === false) {
           $this->logger->error("Error encoding app settings to JSON");
           $status = HttpStatus::INTERNAL_SERVER_ERROR;
       } else {
           $response->getBody()->write($json);
           $status = HttpStatus::SUCCESS;
       }

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->withHeader('Pragma', 'no-cache')
//            ->withHeader('Access-Control-Allow-Origin', '*')
            ->withStatus($status);
    }

}