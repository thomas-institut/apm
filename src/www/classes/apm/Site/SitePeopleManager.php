<?php

namespace APM\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class SitePeopleManager extends SiteController
{
    const TEMPLATE_SCRATCH_PAGE = 'people-manager.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function peopleManagerPage(Request $request, Response $response): Response
    {
        return $this->renderPage($response, self::TEMPLATE_SCRATCH_PAGE,[]);
    }
}