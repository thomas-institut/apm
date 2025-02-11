<?php

namespace APM\Site;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

class SiteMetadataEditor extends SiteController
{
    const TEMPLATE_SCRATCH_PAGE = 'metadataeditor-page.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */


    public function metadataEditorPage(Request $request, Response $response): Response
    {
        $id = $request->getAttribute('id');
        $this->logger->debug("Metadata editor with id $id");
        return $this->renderPage($response, self::TEMPLATE_SCRATCH_PAGE, ['id' => $id]);
    }
}