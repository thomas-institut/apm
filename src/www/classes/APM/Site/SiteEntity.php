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
            $es = $this->systemManager->getEntitySystem();
            $entityData = $es->getEntityData($tid);
            $predicatesAllowedAsSubject = $es->getValidPredicatesAsSubjectForType($entityData->type);
            sort($predicatesAllowedAsSubject, SORT_NUMERIC);
            $predicatesAllowedAsObject = $es->getValidPredicatesAsObjectForType($entityData->type);
            sort($predicatesAllowedAsObject, SORT_NUMERIC);
            $predicateDefs = [];
            foreach ($predicatesAllowedAsSubject as $predicate) {
                if (!isset($predicateDefs[$predicate])) {
                    $predicateDefs[$predicate] = $es->getPredicateDefinition($predicate);
                }
            }
            foreach ($predicatesAllowedAsObject as $predicate) {
                if (!isset($predicateDefs[$predicate])) {
                    $predicateDefs[$predicate] = $es->getPredicateDefinition($predicate);
                }
            }

            $qualificationPredicates = $es->getValidQualificationPredicates();
            $qualificationDefs = [];
            foreach ($qualificationPredicates as $predicate) {
                $qualificationDefs[$predicate] = $es->getPredicateDefinition($predicate);
            }

            return $this->renderPage($response, self::Template_AdminEntity, [
                'entityData' => $entityData,
                'predicatesAllowedAsSubject' => $predicatesAllowedAsSubject,
                'predicatesAllowedAsObject' => $predicatesAllowedAsObject,
                'predicateDefs' => $predicateDefs,
                'qualificationDefs' => $qualificationDefs,
            ]);
        } catch (EntityDoesNotExistException) {
            return $this->getBasicErrorPage($response,  "Not found", "Entity $tid not found", HttpStatus::NOT_FOUND);
        }
    }
}