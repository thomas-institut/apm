<?php

namespace APM\Site;

use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\SystemProfiler;
use APM\ToolBox\HttpStatus;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;


class SiteEntity extends SiteController
{
    public function adminEntityPage(Request $request, Response $response): Response
    {
        $tidString = $request->getAttribute('tid');
        $tid = $this->systemManager->getEntitySystem()->getEntityIdFromString($tidString);

        SystemProfiler::setName("Site:" . __FUNCTION__ . ":$tid");
        try {
            return $this->renderStandardPage(
                $response,
                '',
                'Admin Entity',
                'AdminEntityPage',
                'js/pages/AdminEntityPage/AdminEntityPage.js',
                [
                    'entityData' => $this->systemManager->getEntitySystem()->getEntityData($tid)
                ],
                [],
                ['admin-entity.css']
            );
        } catch (EntityDoesNotExistException) {
            return $this->getBasicErrorPage($response,  "Not found", "Entity $tid not found", HttpStatus::NOT_FOUND);
        }
    }
}