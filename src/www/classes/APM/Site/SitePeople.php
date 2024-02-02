<?php

namespace APM\Site;

use APM\System\Person\PersonNotFoundException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\EntitySystem\Tid;

class SitePeople extends SiteController
{
    const TEMPLATE_PEOPLE = 'people-page.twig';
    const TEMPLATE_PERSON = 'person-page.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function peoplePage(Request $request, Response $response): Response
    {
        return $this->renderPage($response, self::TEMPLATE_PEOPLE,[]);
    }

    public function personPage(Request $request, Response $response): Response
    {
        $tid = $request->getAttribute('tid');

        $pm = $this->systemManager->getPersonManager();

        $tidFromSlug = $pm->getPersonTidFromSlug($tid);
        if ($tidFromSlug !== -1) {
            $tid = $tidFromSlug;
        } else {
            $tid = Tid::fromString($tid);
            if ($tid === -1) {
                return $this->getBasicErrorPage($response, 'Error', "Invalid entity id");
            }
        }
        try {
            $data = $pm->getPersonEssentialData(intval($tid));
            return $this->renderPage($response, self::TEMPLATE_PERSON, ['tid' => $tid, 'data' => $data->getExportObject()]);
        } catch (PersonNotFoundException $e) {
            return $this->getBasicErrorPage($response, 'Person Not Found', "Person $tid not found");
        }
    }

}