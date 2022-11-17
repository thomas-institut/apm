<?php

namespace APM\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class SiteSearch extends SiteController
{
    const TEMPLATE_SCRATCH_PAGE = 'search.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function searchPage(Request $request, Response $response): Response
    {
        return $this->renderPage($response, self::TEMPLATE_SCRATCH_PAGE,[]);
    }
}