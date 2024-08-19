<?php

namespace APM\Site;

use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\SystemProfiler;
use APM\ToolBox\HttpStatus;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\EntitySystem\Tid;


class SiteEntity extends SiteController
{
    const Template_AdminEntity = 'admin-entity.twig';

    public function adminEntityPage(Request $request, Response $response): Response
    {
        $tidString = $request->getAttribute('tid');
        $tid = $this->systemManager->getEntitySystem()->getEntityIdFromString($tidString);

        SystemProfiler::setName(__FUNCTION__ . " $tid");
        try {
            return $this->renderPage($response, self::Template_AdminEntity, [
                'entityData' => $this->systemManager->getEntitySystem()->getEntityData($tid),
            ]);
        } catch (EntityDoesNotExistException) {
            return $this->getBasicErrorPage($response,  "Not found", "Entity $tid not found", HttpStatus::NOT_FOUND);
        }
    }
}