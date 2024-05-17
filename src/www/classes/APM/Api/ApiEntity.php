<?php

namespace APM\Api;

use APM\EntitySystem\EntityEdition\EditorSchema;
use APM\EntitySystem\EntityEdition\Predicate;
use APM\EntitySystem\EntityEdition\Section;
use APM\EntitySystem\EntityEdition\SectionType;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidObjectException;
use APM\EntitySystem\Exception\InvalidStatementException;
use APM\EntitySystem\Exception\InvalidSubjectException;
use APM\EntitySystem\Exception\PredicateCannotBeCancelledException;
use APM\EntitySystem\Exception\StatementAlreadyCancelledException;
use APM\EntitySystem\Exception\StatementNotFoundException;
use APM\EntitySystem\Kernel\PredicateFlag;
use APM\EntitySystem\Schema\Entity;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\ToolBox\HttpStatus;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;


class ApiEntity extends ApiController
{

    const Error_NoError = 0;
    const Error_UserNotAuthorized = 2001;
    const Error_InvalidInput = 2002;
    const Error_NoCommandsInInput = 2003;

    const Error_NoCommand = 2004;
    const Error_NoStatementId = 2005;
    const Error_InvalidCommand = 2006;
    const Error_PredicateCannotBeCancelled = 2007;
    const Error_StatementAlreadyCancelled = 2008;
    const Error_StatementNotFound = 2009;

    const Error_MissingRequiredParameter = 2010;
    const Error_InvalidQualificationsArray = 2011;

    const Error_InvalidObject = 2012;
    const Error_InvalidSubject = 2013;
    const Error_InvalidStatement = 2014;

    const Error_SomeCommandsFailed = 2015;

    const Error_InvalidParameter = 2016;
    const Error_PredicateNotFound = 2017;
    const Error_SystemPredicateNotAllowedForApiUsers = 2018;

    /**
     * API call:
     *
     *   POST:  ../api/entity/statements/edit
     *
     * Performs a number of cancel/create operations on statements.
     *
     * The post contents must be an array of edit command objects in JSON format.
     *
     *   [
     *     {
     *         'command' =>  'cancel' | 'create',
     *         'statementId' =>  someId  (if command is 'cancel')
     *         'subject' => subjectId  (if command is 'create')
     *         'predicate' => predicateId (if command is 'create')
     *         'object' => 'value' | objectId  (if command is 'create')
     *         'qualifications' => array of [ qualificationPredicate, value ] elements, (if command is 'create')
     *         'editorialNote' => 'some text',  (will be used as cancellation note if command is 'cancel')
     *     },
     *
     *     {  ... command 2 ...},
     *     {  ... command 3 ...},
     *
     *     ...
     *   ]
     *
     *   The result will be an object:
     *
     *    {
     *       'success' =>  true|false,    (if false, some general error occurred  )
     *       'errorCode' =>  someInt, (if success === false)
     *       'errorMessage' => 'message string' (if success === false),
     *       'timestamp' => editionTimestamp  (if success === true)
     *       'commandResults' =>  array with one element per input command if success === true
     *    }
     *
     *  Command result:
     *
     *   {
     *      'command' => inputCommand,
     *      'success' =>  true|false,
     *      'newStatementId' => newStatementId  (for new and replace commands),
     *      'errorCode' => someInt,
     *      'errorMessage' => 'message string'
     *   }
     *
     *  For a 'create' command on single value predicates (e.g., the entity name), the system takes care of cancelling the
     *  existing statement, there is no need to add an explicit cancel statement.
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException   // should never happen actually
     */
    public function statementEdition(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        $userManager = $this->systemManager->getUserManager();

        if ($userManager->hasTag($this->apiUserTid, UserTag::READ_ONLY)) {
            return $this->responseWithError($response,
                self::Error_UserNotAuthorized,
                "User is not authorized to update statements",
                HttpStatus::FORBIDDEN);
        }

        $commands = json_decode($request->getBody()->getContents(), true);

        // first, make sure that the commands are right
        if (!is_array($commands)) {
            return $this->responseWithError($response,
                self::Error_InvalidInput,
                "Invalid Input: bad JSON or not an array",
                HttpStatus::BAD_REQUEST);
        }

        if (count($commands) === 0) {
            return $this->responseWithError($response,
                self::Error_NoCommandsInInput,
                "No commands in input",
                HttpStatus::BAD_REQUEST);
        }

        $commandResults = [];
        $es = $this->systemManager->getEntitySystem();
        $timestamp = time();

        foreach ($commands as $command) {

            if (!isset($command['command'])) {
               $commandResults[] = [
                   'success' => false,
                   'errorCode' => self::Error_NoCommand,
                   'errorMessage' => 'No command',
               ];
               continue;
            }

            switch($command['command']) {
                case 'cancel':
                    if (!isset($command['statementId'])) {
                        $commandResults[] = [
                            'success' => false,
                            'errorCode' => self::Error_NoStatementId,
                            'errorMessage' => 'No statement Id given for cancellation',
                        ];
                        break;
                    }
                    $note = $commands['editorialNote'] ?? '';
                    try {
                        $cancellationId = $es->cancelStatement(intval($command['statementId']), $this->apiUserTid, $timestamp, $note);
                        $commandResults[] = [
                            'success' => true,
                            'statementId' => $command['statementId'],
                            'cancellationId' => $cancellationId
                        ];
                    } catch (PredicateCannotBeCancelledException $e) {
                        $commandResults[] = [
                            'success' => false,
                            'errorCode' => self::Error_PredicateCannotBeCancelled,
                            'errorMessage' => $e->getMessage(),
                        ];
                    } catch (StatementAlreadyCancelledException $e) {
                        $commandResults[] = [
                            'success' => false,
                            'errorCode' => self::Error_StatementAlreadyCancelled,
                            'errorMessage' => $e->getMessage(),
                        ];
                    } catch (StatementNotFoundException $e) {
                        $commandResults[] = [
                            'success' => false,
                            'errorCode' => self::Error_StatementNotFound,
                            'errorMessage' => $e->getMessage(),
                        ];
                    }
                    break;

                case 'create':
                    $requiredFields = [ 'subject', 'predicate', 'object'];
                    $errorFound = false;
                    foreach ($requiredFields as $field) {
                        if (!isset($command[$field])) {
                            $errorFound = true;
                            $commandResults[] = [
                                'success' => false,
                                'errorCode' => self::Error_MissingRequiredParameter,
                                'errorMessage' => "Missing required parameter '$field'",
                            ];
                            break;
                        }
                    }
                    if ($errorFound) {
                        break;
                    }
                    $requiredIntegerFields = [ 'subject', 'predicate'];
                    foreach ($requiredIntegerFields as $field) {
                        if (!is_int($command[$field])) {
                            $errorFound = true;
                            $commandResults[] = [
                                'success' => false,
                                'errorCode' => self::Error_InvalidParameter,
                                'errorMessage' => "Parameter '$field' must be an integer",
                            ];
                            break;
                        }
                    }
                    if ($errorFound) {
                        break;
                    }
                    $predicate = $command['predicate'];
                    try {
                        $predicateDef = $es->getPredicateDefinition($predicate);
                        if ($predicateDef->hasFlag(PredicateFlag::SystemPredicate)) {
                            $commandResults[] = [
                                'success' => false,
                                'errorCode' => self::Error_SystemPredicateNotAllowedForApiUsers,
                                'errorMessage' => "Predicate $predicate is a system predicate",
                            ];
                            break;
                        }
                    } catch (EntityDoesNotExistException) {
                        $commandResults[] = [
                            'success' => false,
                            'errorCode' => self::Error_PredicateNotFound,
                            'errorMessage' => "Predicate $predicate not defined in the system",
                        ];
                        break;
                    }
                    if (!(is_int($command['object']) || is_string($command['object']))) {
                        $commandResults[] = [
                            'success' => false,
                            'errorCode' => self::Error_InvalidParameter,
                            'errorMessage' => "Parameter 'object' must be either an integer or a string",
                        ];
                        break;
                    }

                    $qualifications = $command['qualifications'] ?? [];
                    foreach ($qualifications as $index => $qualification) {
                        if (!is_array($qualification) || count($qualification) !== 2) {
                            $commandResults[] = [
                                'success' => false,
                                'errorCode' => self::Error_InvalidQualificationsArray,
                                'errorMessage' => "Qualification element $index not an array of two elements",
                            ];
                            $errorFound = true;
                            break;
                        }
                    }
                    if ($errorFound) {
                        break;
                    }
                    $note = $command['editorialNote'] ?? "Via API, no editorial note left";
                    try {
                        $newStatement = $es->makeStatement($command['subject'], $predicate, $command['object'],
                            $this->apiUserTid, $note, $qualifications, $timestamp);
                        $commandResults[] = [
                            'success' => true,
                            'statementId' => $newStatement,
                        ];

                    } catch (InvalidObjectException $e) {
                        $commandResults[] = [
                            'success' => false,
                            'errorCode' => self::Error_InvalidObject,
                            'errorMessage' => $e->getMessage(),
                        ];
                    } catch (InvalidSubjectException $e) {
                        $commandResults[] = [
                            'success' => false,
                            'errorCode' => self::Error_InvalidSubject,
                            'errorMessage' => $e->getMessage(),
                        ];
                    } catch (InvalidStatementException $e) {
                        $commandResults[] = [
                            'success' => false,
                            'errorCode' => self::Error_InvalidStatement,
                            'errorMessage' => $e->getMessage(),
                        ];
                    }
                    break;

                default:
                    $commandResults[] = [
                        'success' => false,
                        'errorCode' => self::Error_InvalidCommand,
                        'errorMessage' => "Invalid command",
                    ];
            }
        }

        $success = true;
        foreach ($commandResults as $commandResult) {
            if (!$commandResult['success']) {
                $success = false;
                break;
            }
        }

        $entitiesInvolved = [];
        foreach($commands as $command) {
            $entitiesInvolved[]  = $command['subject'];
            $entitiesInvolved[] = $command['object'];
        }

        foreach ($entitiesInvolved as $entity) {
            try {
                if ($es->getEntityType($entity) === Entity::tPerson) {
                    $this->systemManager->onPersonDataChanged($entity);
                    break;
                }
            } catch (EntityDoesNotExistException) {
                // should never happen
            }
        }


        return $this->responseWithJson($response, [
           'success' => $success,
           'errorCode' => $success ? self::Error_NoError : self::Error_SomeCommandsFailed,
           'errorMessage' => $success ? '' : "One or more commands failed",
           'timestamp' => $timestamp,
           'commandResults' => $commandResults
        ]);
    }

    private function responseWithError(Response $response, int $code, string $message, int $httpStatus) : Response {

        $responseData = [
            'success' => false,
            'errorCode' => $code,
            'errorMessage' => $message,
        ];
        $this->logger->error($message,
            [
                'apiUserTid' => $this->apiUserTid,
                'errorCode' => $code,
            ]);
        return $this->responseWithJson($response,
           $responseData, $httpStatus);
    }

    /**
     *
     * API call:
     *
     *    GET  .../api/entity/{tid}/data
     *
     * Returns the entity data for the given entity ID
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
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
     * API call:
     *
     *     GET  .../api/entity/{entityType}/schema
     *
     * Returns the editing schema for an entity of the given type.
     *
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
        $dob->validObjectTypes = [ Entity::ValueTypeVagueDate];
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