<?php

namespace APM\Site;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class SiteMetadata extends SiteController
{
    const TEMPLATE_SCRATCH_PAGE = 'metadata-editor.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function metadataPage(Request $request, Response $response): Response
    {
        return $this->renderPage($response, self::TEMPLATE_SCRATCH_PAGE,[]);
    }
}