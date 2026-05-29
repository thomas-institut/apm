<?php

namespace APM\Site;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;



class SiteMultiChunkEdition extends SiteController
{
    public function getMultiChunkEdition(Request $request, Response $response, bool $new): Response
    {

        return $this->renderStandardPage(
            $response,
            '',
            'MCE Edition',
            'MceComposer',
            'js/MceComposer/MceComposer.ts',
            [
                'editionId' => $new ? -1 : intval($request->getAttribute('editionId'))
            ],
        );
    }
}