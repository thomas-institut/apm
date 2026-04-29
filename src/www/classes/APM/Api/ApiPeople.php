<?php


namespace APM\Api;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\System\Cache\CacheKey;
use APM\System\Person\InvalidPersonNameException;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\ToolBox\HttpStatus;
use Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\Exportable\ExportableObject;

class ApiPeople extends ApiController
{

    const int AllPeopleDataForPeoplePageTtl = 30 * 24 * 3600; // one month
    const int WorksByPersonTtl =  8 * 24 * 3600;

    /**
     * Adjust this number so that rebuilding the data for a part does not take more than a few milliseconds
     * When changing this number, stop the ApmWorkers, delete the PeoplePageData cache and restart
     * the workers again to ensure the cache is regenerated
     */
    const int PeoplePageData_PeoplePerPart = 25;

    public function getPersonEssentialData(Request $request, Response $response): Response {

        $personTid =  (int) $request->getAttribute('tid');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . Tid::toBase36String($personTid));

        $pm = $this->systemManager->getPersonManager();

        try {
            $data = $pm->getPersonEssentialData($personTid);
        } catch (PersonNotFoundException) {
            $this->logger->info("Person does not exist: $personTid");
            $this->logProfilers('errorEncountered');
            return $this->responseWithStatus($response, 404);
        }
        $this->logProfilers('normalFinish');
        try {
            if ($data->isUser && !$this->systemManager->getUserManager()->isUserAllowedTo($this->apiUserId, UserTag::MANAGE_USERS)) {
                $data->userEmailAddress = "N/A";
                $data->userName = 'N/A';
                $data->userTags = [];
            }
        } catch (UserNotFoundException) {
            // should never happen
            $this->logger->error("User not found: $this->apiUserId");
            return $this->responseWithStatus($response, HttpStatus::INTERNAL_SERVER_ERROR);
        }
        return $this->responseWithJson($response, $data->getExportObject());
    }

    public function getAllPeopleDataForPeoplePage(Request $request, Response $response): Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ );
        $cache = $this->systemManager->getSystemDataCache();
        try {
            return $this->responseWithJson($response, unserialize($cache->get(CacheKey::ApiPeople_PeoplePageData_All)));
        } catch (ItemNotInCacheException) {
            $dataToServe = self::buildAllPeopleDataForPeoplePage($this->systemManager->getEntitySystem(), $cache, $this->logger);
            $cache->set(CacheKey::ApiPeople_PeoplePageData_All, serialize($dataToServe), self::AllPeopleDataForPeoplePageTtl);
            return $this->responseWithJson($response, $dataToServe);
        }
    }

    private static function getPeoplePageDataPartCacheKey(int $partNumber) : string {
        return implode(':', [ CacheKey::ApiPeople_PeoplePageData_PartPrefix, $partNumber]);
    }

    public static function invalidatePeoplePageDataPart(int $partNumber, DataCache $cache) : void {
        $cache->delete(self::getPeoplePageDataPartCacheKey($partNumber));
    }

    public static function invalidatePeoplePageDataAllParts(ApmEntitySystemInterface $es, DataCache $cache, LoggerInterface $logger) : void {
        $parts = self::getPartsData($es, $cache, $logger);
        for($i = 0; $i < count($parts); $i++) {
            self::invalidatePeoplePageDataPart($i, $cache);
        }
    }

    public static function onPersonDataChanged(int $id, ApmEntitySystemInterface $es, DataCache $cache, LoggerInterface $logger) : int {
        $parts = self::getPartsData($es, $cache, $logger);
        $numParts = count($parts);
        $partToInvalidate = -1;
        for($i = 0; $i < count($parts); $i++) {
            if (in_array($id, $parts[$i])) {
                $partToInvalidate = $i;
                break;
            }
        }

        if ($partToInvalidate !== -1) {
            self::invalidatePeoplePageDataPart($partToInvalidate, $cache);
        } else {
            // new person, rebuild the parts data
            $cache->delete(CacheKey::ApiPeople_PeoplePageData_Parts);
            $parts = self::getPartsData($es, $cache, $logger);
            if (count($parts) === $numParts) {
                // we have the same number of parts as before,
                // which means that the new person's data belongs in the last part
                // and that part's cache should be invalidated
                // Note that this works because ids are ordered in ascending order when setting up the parts
                // and new ids are always greater than older ones. New ids will always
                // be in the last part.
                $partToInvalidate = $numParts -1;
                self::invalidatePeoplePageDataPart($numParts-1, $cache);
            } else {
                // a new part is needed, but its cache is not built yet
                // so there's no need to invalidate it
                $partToInvalidate = $numParts;
            }
        }

        return $partToInvalidate;
    }


    private static function getPartsData(ApmEntitySystemInterface $es, DataCache $cache, LoggerInterface $logger) : array {
        // check the parts cache
        try {
            $parts = unserialize($cache->get(CacheKey::ApiPeople_PeoplePageData_Parts));
        } catch (ItemNotInCacheException) {
            // build parts structure
            $logger->debug("People page data: parts info not in cache, rebuilding");
            // get all ids, including merged ones so that there's no need to deal with deletions in the cache
            $allPeopleIds = $es->getAllEntitiesForType(Entity::tPerson, true);

            // Sort in ascending order. This ensures that any newly created person will always be in the last part.
            // and therefore current parts will not need to be rebuilt when a new person is created
            sort($allPeopleIds, SORT_NUMERIC);

            $parts = array_chunk($allPeopleIds, self::PeoplePageData_PeoplePerPart);
            $cache->set(CacheKey::ApiPeople_PeoplePageData_Parts, serialize($parts), self::AllPeopleDataForPeoplePageTtl);
        }

        return $parts;
    }

    public static function buildAllPeopleDataForPeoplePage(ApmEntitySystemInterface $es, DataCache $cache, LoggerInterface $logger) : array {
        $parts = self::getPartsData($es, $cache, $logger);
        $dataArray = [];
        for ($i = 0; $i < count($parts); $i++) {
            $partPersonIds = $parts[$i];
            $partCacheKey = self::getPeoplePageDataPartCacheKey($i);
            // check if the part is already built
            try {
                $partData = unserialize($cache->get($partCacheKey));
            } catch (ItemNotInCacheException) {
                // build part data
                $logger->debug("People page data: part $i not in cache, rebuilding");
                $partData  = [];
                foreach ($partPersonIds as $id) {
                    try {
                        $personData = $es->getEntityData($id);
                    } catch (EntityDoesNotExistException) {
                        // should never happen
                        throw new RuntimeException("Entity from all people list does not exist: $id");
                    }

                    $partData[] = [
                        'tid' => $id,
                        'name' => $personData->name,
                        'sortName' => $personData->getObjectForPredicate(Entity::pSortName) ?? '',
                        'dateOfBirth' => $personData->getObjectForPredicate(Entity::pDateOfBirth) ?? '',
                        'dateOfDeath' => $personData->getObjectForPredicate(Entity::pDateOfDeath) ?? '',
                        'isUser' => ($personData->getObjectForPredicate(Entity::pIsUser) ?? '0') === '1',
                        'mergedInto' => $personData->mergedInto,
                    ];
                }
                $cache->set($partCacheKey, serialize($partData), self::AllPeopleDataForPeoplePageTtl);
            }
            array_push($dataArray, ...$partData);
        }
        return $dataArray;
    }

    public static function updateCachedAllPeopleDataForPeoplePage(SystemManager $systemManager) : bool {
        try {
            $data = self::buildAllPeopleDataForPeoplePage($systemManager->getEntitySystem(), $systemManager->getSystemDataCache(), $systemManager->getLogger());
            $systemManager->getSystemDataCache()->set(CacheKey::ApiPeople_PeoplePageData_All,
                serialize($data), self::AllPeopleDataForPeoplePageTtl);
        } catch (Exception $e) {
            $systemManager->getLogger()->error("Exception while updating cached AllPeopleEssentialData",
                [
                    'code' => $e->getCode(),
                    'msg' => $e->getMessage()
                ]);
            return false;
        }
        return true;
    }

    static public function invalidateWorksByPersonCache(SystemManager $systemManager, int $personId) : void {
        if ($personId === -1) {
            return;
        }
       $systemManager->getSystemDataCache()->delete(CacheKey::ApiPeopleWorksByPerson . $personId);
    }

    public function getWorksByPerson(Request $request, Response $response): Response {

        $personTid =  (int) $request->getAttribute('tid');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . Tid::toBase36String($personTid));
        // check cache
        $cacheKey = CacheKey::ApiPeopleWorksByPerson . $personTid;
        $cache = $this->systemManager->getSystemDataCache();

        try {
            $cachedString = $cache->get($cacheKey);
            $data = unserialize($cachedString);
        } catch (ItemNotInCacheException) {
            try {
                $this->systemManager->getPersonManager()->getPersonEssentialData($personTid);
            } catch (PersonNotFoundException) {
                $this->logger->info("Person $personTid not found");
                return $this->responseWithStatus($response, HttpStatus::NOT_FOUND);
            }
            $works = $this->systemManager->getWorkManager()->getWorksByAuthor($personTid);
            $data = ExportableObject::getArrayExportObject($works);
            $cache->set($cacheKey, serialize($data), self::WorksByPersonTtl);
        }
        return $this->responseWithJson($response, [ 'tid' => $personTid, 'works' => $data]);
    }


    public function personCreate(Request $request, Response $response): Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ );

        $inputData = json_decode($request->getBody()->getContents(), true);
        $name = $inputData['name'] ?? '';
        $sortName = $inputData['sortName'] ?? '';

        if ($name === '' || $sortName === '') {
            $this->logger->error("New Person: no name or sortName provided", [ 'apiUserId' => $this->apiUserId, 'inputData' => $inputData]);
            return $this->responseWithJson($response, [ 'errorMsg' => 'No name or sortName provided' ], HttpStatus::BAD_REQUEST);
        }

        $pm = $this->systemManager->getPersonManager();

        try {
            $newPersonId = $pm->createPerson($name, $sortName, $this->apiUserId);
        } catch (InvalidPersonNameException $e) {
            $this->logger->error("Invalid name creating person");
            return $this->responseWithJson($response, [ 'errorMsg' => 'Invalid name' ], HttpStatus::BAD_REQUEST);
        }
        $this->systemManager->onEntityDataChange($newPersonId, $this->apiUserId);
        // the person has been created
        return $this->responseWithJson($response, $newPersonId, HttpStatus::SUCCESS);
    }

}