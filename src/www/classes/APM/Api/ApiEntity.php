<?php

namespace APM\Api;

use APM\EntitySystem\EntityEdition\EditorSchema;
use APM\EntitySystem\EntityEdition\Predicate;
use APM\EntitySystem\EntityEdition\Section;
use APM\EntitySystem\EntityEdition\SectionType;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\ToolBox\HttpStatus;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\EntitySystem\StandardNames;

class ApiEntity extends ApiController
{

    public function getEntityData(Request $request, Response $response): Response {
        $tidString = $request->getAttribute('tid');
        $tid = $this->systemManager->getEntitySystem()->getEntityIdFromString($tidString);

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':'  . $tid);

        try {
            $data = $this->systemManager->getEntitySystem()->getEntityData($tid);
        } catch (EntityDoesNotExistException) {
            $this->logger->info("Entity $tid not found");
            return $this->responseWithStatus($response, HttpStatus::NOT_FOUND);
        }
        return $this->responseWithJson($response, $data);
    }

    /**
     * Returns
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function getEntitySchema(Request $request, Response $response): Response {

        $entityType = intval($request->getAttribute('entityType'));
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':'  . $entityType);

        switch($entityType) {
            case Entity::tPerson:
                return $this->responseWithJson($response, $this->getPersonSchema($this->systemManager->getBaseUrl()));

            default:
                $this->logger->info("Invalid entity type: $entityType");
                return $this->responseWithStatus($response, HttpStatus::BAD_REQUEST);
        }

    }

    private function getPersonSchema(string $baseUrl) : EditorSchema {
        $schema = new EditorSchema();
        $schema->typeId = Entity::tPerson;

        $bioSection = new Section();
        $bioSection->type = SectionType::VerticalList;
        $bioSection->title = 'Biographical Data';

        $dob = new Predicate();
        $dob->id = Entity::pDateOfBirth;
        $dob->title = 'Date of Birth';
        $dob->displayIfNotSet = true;
        $dob->isUniqueInSection = true;

        $dod = new Predicate();
        $dod->id = Entity::pDateOfDeath;
        $dod->title = 'Date of Death';
        $dod->displayIfNotSet = true;
        $dod->isUniqueInSection = true;
        $bioSection->predicates  = [ $dob, $dod];

        $externalIdsSection = new Section();
        $externalIdsSection->title = '';
        $externalIdsSection->type = SectionType::HorizontalList;
        $def = [
            Entity::pOrcid => "$baseUrl/orcid-logo.svg",
            Entity::pViafId => "$baseUrl/viaf-logo.svg",
            Entity::pGNDId => "$baseUrl/gnd-logo.svg",
        ];

        foreach($def as $id => $logoUrl) {
            $predicate = new Predicate();
            $predicate->id = $id;
            $predicate->iconUrl = $logoUrl;
            $predicate->isRelation = false;
            $externalIdsSection->predicates[] = $predicate;
        }


        $externalLinksSection = new Section();
        $externalLinksSection->title= 'External Links';
        $externalLinksSection->type = SectionType::UrlList;
        $externalLinksSection->singlePredicate = true;

        $urlPredicate = new Predicate();
        $urlPredicate->id = Entity::pUrl;
        $urlPredicate->isUniqueInSection = false;
        $urlPredicate->isRelation = false;
        $externalLinksSection->predicates = [$urlPredicate];
        $externalLinksSection->qualificationPredicates = [ Entity::pObjectUrlType];

        $schema->sections = [ $bioSection, $externalIdsSection, $externalLinksSection ];

        return $schema;
    }

}