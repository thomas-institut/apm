<?php

namespace APM\CommandLine\DataGrabber;

use APM\CommandLine\ApmCtlUtility\AdminUtility;
use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use Exception;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\ItemNotInCacheException;

class WikiDataGrabber extends CommandLineUtility implements AdminUtility
{
    const string CMD = 'wikidata';

    const string USAGE = self::CMD . " all | <tid1> <tid2> ... [doIt]";
    const string DESCRIPTION = "Grabs people data from WikiData";

    const string MemCachedPrefix = 'WikiDataGrabber:';
    const int MemCachedTtl = 86400;
    private DataCache $memCache;
    private Client $guzzleClient;

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);
        $this->memCache = $this->getSystemManager()->getMemDataCache();
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

        $tids = $this->getTidsFromArgv();

        if (count($tids) === 0) {
            print "Please enter a list of entities separated by spaces\n";
            return 0;
        }

        $hotRun = false;
        if ($argv[count($argv)-1] === 'doIt') {
            print "Hot Run\n";
            $hotRun = true;
        }


        $es = $this->getSystemManager()->getEntitySystem();

        $getDateFromWikiDataTimeValue = function (string $wikiDataValue) : string {

            if ($wikiDataValue === '') {
                return '';
            }
            if ($wikiDataValue[0] === 'h') {
                // a url!
                return '';
            }
            [ $date, ] = explode('T', $wikiDataValue);
            $negativeYear = false;

            if($date[0] === '-') {
                $negativeYear = true;
                [ , $year, $month, $day ] = explode('-', $date);
            } else {
                [ $year, $month, $day ] = explode('-', $date);
            }

            $year = intval($year);
            if ($negativeYear) {
                $year = -$year;
            }


            if ($month === '01' && $day === '01') {
                return $year;
            }
            return $year . '-' . $month . '-' . $day;
        };

        $dataToGrab = [];

        $dataToGrab[] = [
            'name' => 'Date of Birth',
            'wikiDataProperty' => 'P569',
            'predicate' =>   Entity::pDateOfBirth,
            'singleValue' => true,
            'generator' => $getDateFromWikiDataTimeValue
        ];

        $dataToGrab[] = [
            'name' => 'Date of Death',
            'wikiDataProperty' => 'P570',
            'predicate' =>   Entity::pDateOfDeath,
            'singleValue' => true,
            'generator' => $getDateFromWikiDataTimeValue
        ];


        foreach ($tids as $tid) {

            try {
                $entityData = $es->getEntityData($tid);
            } catch (EntityDoesNotExistException) {
                print "Entity $tid does not exist, skipping\n";
                continue;
            }

            if ($entityData->type !== Entity::tPerson) {
                print "Entity $tid is not a person, skipping\n";
                continue;
            }

            $wikiDataIdStatement = $entityData->getStatementForPredicate(Entity::pWikiDataId);
            $wikiDataId = $wikiDataIdStatement?->object;

            if ($wikiDataId === null) {
                continue;
            }

            if ($wikiDataId === 0 || $wikiDataId === '0') {
                print "Incorrect WikiData id  '$wikiDataId' for entity $tid, skipping\n";
                continue;
            }

            print "Entity $tid ('$entityData->name'): wikidata $wikiDataId\n";

            foreach($dataToGrab as $datumToGrab) {
                [ $result, $valueArray ] = $this->getWikiDataValues($wikiDataId, $datumToGrab['wikiDataProperty']);
                if ($result === false) {
                    print "  ERROR: $valueArray\n";
                    continue;
                }
                if ($datumToGrab['singleValue']) {
                    $val = $valueArray[0] ?? '';
                    if (isset($datumToGrab['generator'])) {
                        $val = call_user_func($datumToGrab['generator'], $val);
                    }
                    if ($val !== '') {
                        // There's a value in wikidata
                        $statement = $entityData->getStatementForPredicate($datumToGrab['predicate']);
                        $valueInEs = $statement?->object;
                        if ($valueInEs === null) {
                            // add it!
                            print "  * " . $datumToGrab['name'] . ": " . $val . "\n";
                            if ($hotRun) {
                                $es->makeStatement($tid, $datumToGrab['predicate'], $val, Entity::System, 'Imported from WikiData');
                            }
                        } else {
                            if ($val !== $valueInEs) {
                                print "  " . $datumToGrab['name'] . ": APM = $valueInEs, WikiData = $val\n";
                            }
                        }

                    }
                } else {
                    if (count($valueArray) !== 0) {
                        print "  " . $datumToGrab['name'] . ": [" . implode(', ', $valueArray) . ']'. "\n";
                    }
                }
            }
        }

        return 1;


    }


    private function getTidsFromArgv() : array {
        if ($this->argc < 2) {
            return [];

        }
        $es = $this->getSystemManager()->getEntitySystem();
        if ($this->argv[1] === 'all') {
            return $es->getAllEntitiesForType(Entity::tPerson);
        }
        $tids = [];
        for($i  = 1; $i < $this->argc; $i++) {
            if ($this->argv[$i] === 'doIt') {
                continue;
            }
            $tid = $es->getEntityIdFromString($this->argv[$i]);
            if ($tid !== -1) {
                $tids[] = $tid;
            }
        }
        return $tids;
    }

    private function getWikiDataValues(string $wikiDataId, string $wikidataProperty) : array  {

        try {
            return [ true, unserialize($this->memCache->get(self::MemCachedPrefix . $wikiDataId . $wikidataProperty))];
        } catch (ItemNotInCacheException) {
            $sparqlQuery= "SELECT ?val WHERE {wd:$wikiDataId wdt:$wikidataProperty ?val.}";
            $queryUrl = "https://query.wikidata.org/sparql?query=" . urldecode($sparqlQuery) . "&format=json";
            try {
                $wikiDataJson = $this->guzzleClient->get($queryUrl)->getBody()->getContents();
            } catch (ClientException $e) {
                return [ false, $e->getResponse()->getStatusCode()];
            } catch (GuzzleException | Exception $e) {
                return [false, $e->getMessage()];
            } 
            $data = json_decode($wikiDataJson, true);
            $bindings = $data['results']['bindings'] ?? [];
            $values = [];
            foreach ($bindings as $binding) {
                $val = $binding['val']['value'] ?? '';
                if ($val !== '') {
                    $values[] = $val;
                }
           }
            $this->memCache->set(self::MemCachedPrefix . $wikiDataId . $wikidataProperty, serialize($values), self::MemCachedTtl);
            return [ true, $values ];
        }
    }
}

