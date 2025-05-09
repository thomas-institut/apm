<?php

namespace APM\CommandLine\DataGrabber;

use APM\CommandLine\ApmCtlUtility\AdminUtility;
use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\PredicateCannotBeCancelledException;
use APM\EntitySystem\Exception\StatementAlreadyCancelledException;
use APM\EntitySystem\Exception\StatementNotFoundException;
use APM\EntitySystem\Schema\Entity;
use APM\ToolBox\HttpStatus;
use Exception;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\MemcachedDataCache\MemcachedDataCache;

class ViafIdGrabber extends CommandLineUtility implements AdminUtility
{
    const CMD = 'viaf';

    const USAGE = self::CMD . " all | <tid1> <tid2> ... [doIt]";
    const DESCRIPTION = "Grabs people external ids from VIAF";

    const MemCachedPrefix = 'viaf_id_grabber-';
    const MemCachedTtl = 86400;
    private MemcachedDataCache $memCache;
    private Client $guzzleClient;

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);
        $this->memCache = new MemcachedDataCache();
        $this->guzzleClient = new Client();
    }

    public function getCommand(): string
    {
        return self::CMD;
    }

    public function getHelp(): string
    {
        return self::USAGE;
    }

    public function getDescription(): string
    {
        return self::DESCRIPTION;
    }

    public function main($argc, $argv) : int
    {
        if ($argc === 1) {
            print "USAGE: " . self::USAGE . "\n";
            return 0;
        }

        array_shift($argv);
        $pdo = $this->getSystemManager()->getDbConnection();

        $es = $this->getSystemManager()->getEntitySystem();
        if (in_array('all', $argv)){
            $tids = $es->getAllEntitiesForType(Entity::tPerson);
        } else {
            $tids = DataGrabberUtil::getTidsFromArgv($es,$argv);
        }
        if (count($tids) === 0) {
            print "Please enter a list of entities separated by spaces\n";
            return 0;
        }

        $hotRun = false;
        if (in_array('doIt', $argv)) {
            print ">>>>> Hot Run !!!!!\n";
            $pdo->beginTransaction();
            $hotRun = true;
        }

        $getIdFromUrl = function (string $url) : string {
            $id = '';
            $url = rtrim(trim($url), '/');
            if ($url !== '') {
                $fields = explode('/', $url);
                $id = $fields[count($fields)-1];
            }
            return $id;
        };

        $dataToGrab = [];

        $dataToGrab[] = [
            'name' => 'Wikidata',
            'viafRecord' => 'WKP',
            'predicate' =>   Entity::pWikiDataId,
        ];

        $dataToGrab[] = [
            'name' => 'Library of Congress',
            'viafRecord' => 'LC',
            'predicate' =>   Entity::pLocId,
        ];

        $dataToGrab[] = [
            'name' => 'DNB',
            'viafRecord' => 'DNB',
            'predicate' =>   Entity::pUrl,
            'qualificationPredicate' => Entity::pObjectUrlType,
            'qualification' => Entity::UrlTypeDnb
        ];

        $dataToGrab[] = [
            'name' => 'GND',
            'viafRecord' => 'DNB',
            'predicate' =>   Entity::pGNDId,
            'generator' => $getIdFromUrl
        ];
        $dataToGrab[] = [
            'name' => 'ORCiD',
            'viafRecord' => 'ORCID',
            'predicate' =>  Entity::pOrcid,
            'generator' => $getIdFromUrl
        ];


        foreach ($tids as $tid) {
            print "Entity $tid: ";

            try {
                $entityData = $es->getEntityData($tid);
            } catch (EntityDoesNotExistException) {
                print "  ERROR: Entity does not exist\n";
                continue;
            }

            if ($entityData->type !== Entity::tPerson) {
                print "  ERROR: Entity is not a Person\n";
                continue;
            }

            print "'$entityData->name'";

            $viafIdStatement = $entityData->getStatementForPredicate(Entity::pViafId);

            $viafId = $viafIdStatement?->object;

            if ($viafId === null) {
                print " : No VIAF id found\n";
                continue;
            }

            if ($viafId === 0 || $viafId === '0') {
                print " : Incorrect VIAF id: '$viafId'\n";
                continue;
            }

            print ", VIAF id: $viafId\n";

            [ $result, $viafData ] = $this->getViafData($viafId);
            if ($result === false) {
                if ($viafData === HttpStatus::NOT_FOUND) {
                    print "  ERROR: VIAF returned status 404 (Not Found), VIAF id is most likely incorrect\n";
                    continue;
                }
                print "  ERROR: $viafData\n";
                continue;
            }

            if (is_int($viafData)) {
                // entity has new viaf id
                $newViafId  = substr(strval($viafData), strlen($viafId));
                print "  * VIAF ID: $viafId -> $newViafId\n";
                [ $result, $viafData ] = $this->getViafData($newViafId);
                if ($result === false) {
                    print "  ERROR: $viafData\n";
                    continue;
                }
                if (is_int($viafData)) {
                    print "  ERROR getting data for new VIAF id\n";
                    continue;
                }
                if ($hotRun) {
                    try {
                        $es->cancelStatement($viafIdStatement->id, Entity::System, -1, "VIAF reports a new VIAF id");
                    } catch (PredicateCannotBeCancelledException|StatementNotFoundException|StatementAlreadyCancelledException) {
                        print "  ERROR replacing VIAF id\n";
                        continue;
                    }
                    $es->makeStatement($tid, Entity::pViafId, $newViafId,
                        Entity::System, 'New id reported by VIAF');
                }
            }

            foreach($dataToGrab as $datumToGrab) {
                $valueInViaf = $viafData[$datumToGrab['viafRecord']][0] ?? '';
                $statement = $entityData->getStatementForPredicate($datumToGrab['predicate'],
                    $datumToGrab['qualificationPredicate'] ?? null, $datumToGrab['qualification'] ?? null);
                $valueInEs = $statement?->object;
                $generator = $datumToGrab['generator'] ?? null;
                if ($generator !== null) {
                    $valueInViaf = call_user_func($generator, $valueInViaf);
                }
                if ($valueInViaf !== '') {
                    $metadata = [];
                    if (isset($datumToGrab['qualificationPredicate'])) {
                        $metadata[] =[ $datumToGrab['qualificationPredicate'], $datumToGrab['qualification'] ];
                    }
                    if ($valueInEs === null) {
                        printf("  * %s: %s (new)\n", $datumToGrab['name'], $valueInViaf);
                        if ($hotRun) {
                            $es->makeStatement($tid, $datumToGrab['predicate'], $valueInViaf,
                                Entity::System, 'Imported from VIAF', $metadata);
                        }

                    } else {
                        if ($valueInEs !== $valueInViaf) {
                            printf("  * %s: %s -> %s\n",  $datumToGrab['name'], $valueInEs, $valueInViaf);
                            if ($hotRun) {
                                try {
                                    $es->cancelStatement($statement->id, Entity::System, -1, "Replacing with value from VIAF");
                                } catch (PredicateCannotBeCancelledException|StatementNotFoundException|StatementAlreadyCancelledException) {
                                    print "  ERROR replacing VIAF id\n";
                                    continue;
                                }
                                $es->makeStatement($tid, $datumToGrab['predicate'], $valueInViaf,
                                    Entity::System, 'Imported from VIAF', $metadata);
                            }
                        }
                    }
                }
            }
        }

        if ($hotRun) {
            $pdo->commit();
        }

        return 1;


    }


    private function getViafData(string $viafId) : array {

        try {
            return [ true, unserialize($this->memCache->get(self::MemCachedPrefix . $viafId))];
        } catch (ItemNotInCacheException) {
            try {
                $viafJson = $this->guzzleClient->get("https://viaf.org/viaf/$viafId/justlinks.json")->getBody()->getContents();
            } catch (ClientException $e) {
                return [ false, $e->getResponse()->getStatusCode()];
            } catch (GuzzleException | Exception $e) {
                return [false, $e->getMessage()];
            }
            $data = json_decode($viafJson, true);
            $this->memCache->set(self::MemCachedPrefix . $viafId, serialize($data), self::MemCachedTtl);
            return [ true, $data ];
        }

    }
}

