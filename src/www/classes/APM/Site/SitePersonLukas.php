<?php

namespace APM\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class SitePersonLukas extends SiteController
{
    const TEMPLATE_SCRATCH_PAGE = 'person-page.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */


    public function personPage(Request $request, Response $response): Response
    {
        $id = $request->getAttribute('id');
        return $this->renderPage($response, self::TEMPLATE_SCRATCH_PAGE, ['id' => $id]);
    }
}