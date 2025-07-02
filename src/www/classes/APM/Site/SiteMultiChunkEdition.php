<?php

namespace APM\Site;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;



class SiteMultiChunkEdition extends SiteController
{

    public function newMultiChunkEdition(Response $response): Response
    {
        return $this->renderStandardPage(
            $response,
            '',
            'MCE Edition',
            'MceComposer',
            'js/MceComposer/MceComposer.js',
            [
                'editionId' => -1
            ],
            [],
            [ 'multi-panel-ui/styles.css', 'mc-edition-composer.css']
        );
    }

    public function getMultiChunkEdition(Request $request, Response $response): Response
    {

        return $this->renderStandardPage(
            $response,
            '',
            'MCE Edition',
            'MceComposer',
            'js/MceComposer/MceComposer.js',
            [
                'editionId' => intval($request->getAttribute('editionId'))
            ],
            [],
            [ 'multi-panel-ui/styles.css', 'mc-edition-composer.css']
        );
    }
}