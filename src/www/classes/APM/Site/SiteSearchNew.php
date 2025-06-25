<?php

namespace APM\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class SiteSearchNew extends SiteController
{
    const string TEMPLATE_SEARCH_PAGE = 'search.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function searchPage(Request $request, Response $response): Response
    {
        return $this->renderPage($response, self::TEMPLATE_SEARCH_PAGE,[]);
    }
}