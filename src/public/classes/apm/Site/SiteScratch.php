<?php

namespace APM\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class SiteScratch extends \APM\Site\SiteController
{
    const TEMPLATE_BASE_PAGE = 'scratch.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function scratchPage(Request $request, Response $response): Response
    {
        $text = "Hello World";

        return $this->renderPage($response, self::TEMPLATE_BASE_PAGE, ['scratch' => $text]);
    }

}