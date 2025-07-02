<?php

namespace APM\Site;

use APM\SystemProfiler;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

class SiteSearch extends SiteController
{

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function searchPage(Request $request, Response $response): Response
    {
        SystemProfiler::setName(__FUNCTION__);
        return $this->renderStandardPage(
            $response,
            '',
            'Search',
            'SearchPage',
            'js/pages/SearchPage.js'
        );
    }
}