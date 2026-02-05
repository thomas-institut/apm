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
            'js/MceComposer/MceComposer.ts',
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
            'js/MceComposer/MceComposer.ts',
            [
                'editionId' => intval($request->getAttribute('editionId'))
            ],
            [],
            [ '../node_modules/datatables.net-dt/css/jquery.dataTables.min.css', 'multi-panel-ui/styles.css', 'mc-edition-composer.css']
        );
    }
}