<?php

namespace APM\Site;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

class SiteMetadataEditor extends SiteController
{
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */


    public function metadataEditorPage(Request $request, Response $response): Response
    {
        $id = $request->getAttribute('id');
        $this->logger->debug("Metadata editor with id $id");

        return $this->renderStandardPage(
            $response,
            '',
            'Dev Metadata Editor',
            'DevelopmentEntityDataEditor',
            'js/pages/DevelopmentEntityDataEditor.js',
            [
                'id' => intval($id)
            ],
            [],
            ['metadata-editor.css']
        );
    }
}