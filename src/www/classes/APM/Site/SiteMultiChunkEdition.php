<?php

namespace APM\Site;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;



class SiteMultiChunkEdition extends SiteController
{

    const TEMPLATE_EDITION_COMPOSER = 'mc-edition-composer.twig';

    public function newMultiChunkEdition(Response $response): Response
    {
        return $this->renderPage($response, self::TEMPLATE_EDITION_COMPOSER, [
            'editionId' => -1
        ]);
    }

    public function getMultiChunkEdition(Request $request, Response $response): Response
    {
        return $this->renderPage($response, self::TEMPLATE_EDITION_COMPOSER, [
            'editionId' => intval($request->getAttribute('editionId'))
        ]);
    }
}