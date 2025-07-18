<?php

/*
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General private License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General private License for more details.
 *
 *  You should have received a copy of the GNU General private License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

namespace APM\CommandLine;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidEntityTypeException;
use APM\EntitySystem\Schema\Entity;
use GuzzleHttp\Client as HttpClient;
use stdClass;


/**
 * Description of EntityManager
 *
 * Commandline utility to create entities and predicates for documents, countries, cities and institutions from the dare data contained in csv-files.
 * Use option '-h' in the command line for getting information about how to use the entity manager.
 *
 * @author Lukas Reichert
 */
class EntityManager extends CommandLineUtility
{

    private ApmEntitySystemInterface $es;
    private array $existingEntities = [
        Entity::tCountry => [],
        Entity::tCity => [],
        Entity::tInstitution => [],
        Entity::tDocument => []
    ];

    /**
     * This main function is called from the command line. Depending on the arguments given to the location entity creator command line tool,
     * a specific operation will be executed.
     * @param $argc
     * @param $argv
     * @return bool
     */
    public function main($argc, $argv): bool
    {

        $this->es = $this->getSystemManager()->getEntitySystem();

        // print help
        if (count($argv) < 1 || $argv[1] === '-h') {
            $this->printHelp();
            return true;
        }

        // get operation
        $operation = $argv[1];

        switch ($operation) {
            case 'showEntity':
                $entity = $this->es->getEntityData($argv[2]);
                print_r($entity);
                break;

            case 'createCountry':
                $result = $this->createCountry($argv[2]);
                print($result['message']);
                $this->addAltNamesToEntity($argv[2], $result['tid'], Entity::tCountry);
                break;

            case 'createCity':
                $result = $this->createCity($argv[2]);
                print($result['message']);
                $this->addAltNamesToEntity($argv[2], $result['tid'], Entity::tCity);
                break;

            case 'createInstitution':
                $result = $this->createInstitution($argv[2]);
                print($result['message']);
                break;

            case 'createDocument':
                $result = $this->createDocument($argv[2]);
                print($result['message']);
                break;

            case 'buildLocations':
                if (!isset($argv[2])) {
                    $verbose = false;
                } else if ($argv[2] === "v") {
                    $verbose = true;
                } else {
                    print("The second argument can only be 'v' for verbose. You will find some help via 'entitymanager -h'.\n");
                    break;
                }
                $this->createLocationEntitiesFromFile($verbose);
                break;

            case 'buildDocuments':
                if (!isset($argv[2])) {
                    $verbose = false;
                } else if ($argv[2] === "v") {
                    $verbose = true;
                } else {
                    print("The second argument can only be 'v' for verbose. You will find some help via 'entitymanager -h'.\n");
                    break;
                }
                $result = $this->createDocumentEntitiesWithPredicatesFromDareData($verbose);
                print_r($result);
                break;

            default:
                print("You will find some help via 'entitymanager -h'\n.");
                break;
        }

        return true;
    }

    /**
     * Prints information about how to use the location entity creator command line tool. Use option -h in the command line to get the information.
     * @return void
     */
    private function printHelp(): void
    {
        $help = <<<END
Usage: entitymanager [operation] ([arg])

Available operations are:
  showEntity [arg1] – shows information about an entity with the given tid
  createCountry [arg1]  - creates an entity of the type ,country‘ with the given english name and adds german and italian names automatically
  createCity [arg1] - creates an entity of the type ,city‘ with the given english name and adds german and italian names automatically
  createInstitution [arg1] - creates an entity of the type ,institution‘ with the given english name
  createDocument [arg] - creates an entity of the type ,document‘ for the given bilderberg id
  buildLocations [v(erbose)] - creates country, city, institution and document entitites from the data of a csv-file, which was created by the locationdatagrabber buildEssentials command.
  buildDocuments [v(erbose)] - creates document entitites with a lot of predicates, retrieved from the dare documents table.
END;

        print($help);
    }

    /**
     * Create an entity if it does not already exist.
     * @param int $type one of Entity::tCountry, tCity, tInstitution, tDocument
     * @param string $name entity name
     * @param int $creatorTid
     * @param bool $addSortName whether to add a sort name statement
     * @return array
     * @throws EntityDoesNotExistException
     * @throws \APM\EntitySystem\Exception\InvalidObjectException
     * @throws \APM\EntitySystem\Exception\InvalidStatementException
     * @throws \APM\EntitySystem\Exception\InvalidSubjectException
     */
    private function createEntityOfType(int $type, string $name, int $creatorTid = -1, bool $addSortName = false): array
    {
        // set system as creator
        if ($creatorTid === -1) $creatorTid = Entity::System;

        // get all existing entities of the given type
        $namesToTids = [];

        if ($this->existingEntities[$type] === []) {
            foreach ($this->es->getAllEntitiesForType($type) as $tid) {
                $entityName = $this->es->getEntityData($tid)->name;
                $namesToTids[$entityName] = $tid;
            }
            $this->existingEntities[$type] = $namesToTids;
        } else {
            $namesToTids = $this->existingEntities[$type];
        }

        // this array will be used for the return message
        $typeNames = [
            Entity::tCountry => 'country',
            Entity::tCity => 'city',
            Entity::tInstitution => 'institution',
            Entity::tDocument => 'document'];

        // if entity does not already exist, create it
        if (!array_key_exists($name, $namesToTids)) {
            try {
                $tid = $this->es->createEntity($type, $name, '', $creatorTid);
                if ($addSortName) {
                    $this->es->makeStatement($tid, Entity::pSortName, $name, $creatorTid, "Adding sort name $name automatically.");
                }
            } catch (InvalidEntityTypeException) {
                throw new \RuntimeException("Invalid type, should never happen");
            }
            return ['message' => "\tcreated {$typeNames[$type]} $name (tid: $tid).\n", 'tid' => $tid];
        } else {
            $existingTid = $namesToTids[$name];
            return ['message' => "\tNO {$typeNames[$type]} $name created, already exists (tid: $existingTid).\n", 'tid' => $existingTid];
        }
    }

    private function createCountry(string $name, int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tCountry, $name, $creatorTid, true);
    }

    private function createCity(string $name, int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tCity, $name, $creatorTid, true);
    }

    private function createInstitution(string $name, int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tInstitution, $name, $creatorTid, true);
    }

    private function createDocument(string $bilderbergId, int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tDocument, $bilderbergId, $creatorTid);
    }

    /**
     * sets up an http client and queries wikidata
     * @param string $query
     * @param string $userAgent
     * @return array
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    private function runWikidataSparqlQuery(string $query, string $userAgent = 'AltNameFetcherBot/1.0'): array
    {
        $client = new HttpClient();
        try {
            $response = $client->get('https://query.wikidata.org/sparql', [
                'headers' => [
                    'Accept' => 'application/sparql-results+json',
                    'User-Agent' => $userAgent,
                ],
                'query' => [
                    'format' => 'json',
                    'query' => $query,
                ],
                'timeout' => 15,
            ]);
            $decoded = json_decode($response->getBody(), true);
            return $decoded['results']['bindings'] ?? [];
        } catch (\Exception $e) {
            // Optional: handle error/log
        }
        return [];
    }

    /**
     * gets the german and italian names from wikidata for a given english country name
     * @param string $englishName
     * @return array|array[]
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    private function getAltNamesForCountryFromWikidata(string $englishName): array
    {
        $englishName = trim($englishName);
        if ($englishName === '') return [];

        $query = <<<SPARQL
SELECT ?de ?it WHERE {
  ?country rdfs:label "$englishName"@en.
  ?country wdt:P31 wd:Q6256.
  OPTIONAL { ?country rdfs:label ?de FILTER (lang(?de) = "de") }
  OPTIONAL { ?country rdfs:label ?it FILTER (lang(?it) = "it") }
}
LIMIT 1
SPARQL;

        $results = $this->runWikidataSparqlQuery($query);
        if (empty($results)) return [];
        $row = $results[0];
        return [
            ['lang' => Entity::LangGerman, 'name' => $row['de']['value'] ?? ''],
            ['lang' => Entity::LangItalian, 'name' => $row['it']['value'] ?? '']
        ];
    }

    /**
     * gets the german and italian names from wikidata for a given english city name
     * @param string $englishName
     * @return array|array[]
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    private function getAltNamesForCityFromWikidata(string $englishName): array
    {
        $englishName = trim($englishName);
        if ($englishName === '') return [];

        $query = <<<SPARQL
SELECT ?label ?lang WHERE {
  ?city rdfs:label "$englishName"@en.
  ?city wdt:P31/wdt:P279* wd:Q515.
  ?city rdfs:label ?label.
  BIND(LANG(?label) AS ?lang)
  FILTER (?lang IN ("de", "it"))
}
SPARQL;

        $results = $this->runWikidataSparqlQuery($query);
        $names = [];
        foreach ($results as $row) {
            $lang = $row['lang']['value'];
            $name = $row['label']['value'];
            $names[$lang] = $name;
        }
        if (!isset($names['de']) && !isset($names['it'])) {
            return [];
        }
        return [
            ['lang' => Entity::LangGerman, 'name' => $names['de'] ?? ''],
            ['lang' => Entity::LangItalian, 'name' => $names['it'] ?? ''],
        ];
    }


    /**
     * reads the names and associations of/between countries, cities, institutions and documents out of a csv-file,
     * creates entities for them, if not already existing, and associates the entities to each other
     * @param bool $verbose
     * @param int $creatorTid
     * @return void
     * @throws EntityDoesNotExistException
     * @throws \APM\EntitySystem\Exception\InvalidObjectException
     * @throws \APM\EntitySystem\Exception\InvalidStatementException
     * @throws \APM\EntitySystem\Exception\InvalidSubjectException
     */
    private function createLocationEntitiesFromFile(bool $verbose=false, int $creatorTid = -1): void
    {

        // set system as the creator
        if ($creatorTid === -1) {
            $creatorTid = Entity::System;
        }

        // make arrays for already detected entities to avoid duplicates
        $detectedCountries = [''];
        $detectedCities = [''];
        $detectedInstitutions = [''];
        $detectedTriples = [];

        // read csv-file
        $filename = '/var/apm/share/locationDataToBeRevised.csv';
        $data = $this->readCsvWithSingleHeaderToObjectArray($filename);

        // make counters for documentation of results
        $numCreatedCountries = 0;
        $numCreatedCities = 0;
        $numCreatedInstitutions = 0;
        $numCreatedRelations = 0;
        $numSkippedRows = 0;
        $numSkippedCells = 0;

        // count table rows
        $numRows = count($data);

        print("There are $numRows rows to process.\nThe processing begins after having collected all data.\n");
        // print($verbose);

        // create entities from the data and make the corresponding statements
        foreach ($data as $i=>$row) {

            printf("    %d rows processed\r", $i);

            // extract relevant entity data
            $institutionName = '';
            $cityName = '';
            $countryName = '';
            $locationCode = $row->locationCodeCountryCityInstitution;

            if ($row->institutionDare !== '') {
                $institutionName = $row->institutionDare;
            }

            if ($row->cityWikidataEnglish !== '') {
                $cityName = $row->cityWikidataEnglish;
            }

            if ($row->countryWikidataEnglish !== '') {
                $countryName = $row->countryWikidataEnglish;
            }

            $detectedTriple = [$countryName, $cityName, $institutionName];

            if ($verbose) {
                print("detected location code: $locationCode\n");
            }

            // check if the detected triple is empty or has not already been processed
            if (!in_array($detectedTriple, $detectedTriples) and $detectedTriple !== ['', '', '']) { // if not, process the triple

                if ($verbose) {
                    print("\tdetected location data: $countryName, $cityName, $institutionName\n");
                }

                // create country, city and institution entities
                if ($countryName !== '') {
                    if (!in_array($countryName, $detectedCountries)) {
                        $result = $this->createCountry($countryName);
                        if ($verbose) {
                            print($result['message']);
                        }
                        $countryTid = $result['tid'];
                        if (!str_starts_with($result['message'], "\tNO")) {
                            $numCreatedCountries++;
                        }
                        $this->addAltNamesToEntity($countryName, $countryTid, Entity::tCountry, $creatorTid, $verbose);
                    } else if ($verbose) {
                        print("\tcountry with name $countryName already created.\n");
                    }
                } else {
                    $numSkippedCells++;
                }

                if ($cityName !== '') {
                    if (!in_array($cityName, $detectedCities)) {
                        $result = $this->createCity($cityName);
                        if ($verbose) {
                            print($result['message']);
                        }
                        $cityTid = $result['tid'];
                        if (!str_starts_with($result['message'], "\tNO")) {
                            $numCreatedCities++;
                        }
                        $this->addAltNamesToEntity($cityName, $cityTid, Entity::tCity, $creatorTid, $verbose);
                    } else if ($verbose) {
                        print("\tcity with name $cityName already created.\n");
                    }
                } else {
                    $numSkippedCells++;
                }

                if ($institutionName !== '') {
                    if (!in_array($institutionName, $detectedInstitutions)) {
                        $result = $this->createInstitution($institutionName);
                        if ($verbose) {
                            print($result['message']);
                        }
                        $institutionTid = $result['tid'];
                        if (!str_starts_with($result['message'], "\tNO")) {
                            $numCreatedInstitutions++;
                        }
                    } else if ($verbose) {
                        print("\tinstitution with name $institutionName already created.\n");
                    }
                } else {
                    $numSkippedCells++;
                }

                // save the entity names in the detected data arrays
                $detectedTriples[] = $detectedTriple;
                $detectedCountries[] = $countryName;
                $detectedCities[] = $cityName;
                $detectedInstitutions[] = $institutionName;

                // associate the entities to each other
                if (!($countryName === '' or $cityName === '')) {
                    $this->es->makeStatement($countryTid, Entity::pContains, $cityTid, $creatorTid, 'Associating country with city.');
                    $numCreatedRelations++;


                    if ($verbose) {
                        print("\tassociated: $countryName-->contains-->$cityName.\n");
                    }
                }

                if (!($cityName === '' or $institutionName === '')) {
                    $this->es->makeStatement($institutionTid, Entity::pLocatedIn, $cityTid, $creatorTid, 'Associating institution with city.');
                    $numCreatedRelations++;


                    if ($verbose) {
                        print("\tassociated: $institutionName-->locatedIn-->$cityName.\n");
                    }
                }

            } else if ($detectedTriple === ['', '', ''] and $verbose) {
                print("\tNO location data detected.\n");
            } else if ($verbose) {
                print("\tNO NEW location data detected.\n");
            }

        }

        // display results to the user
        print ("FINISHED LOCATION ENTITY CREATIONS AND ASSOCIATIONS!\n\t");
        print("$numCreatedCountries countries created.\n\t
       $numCreatedCities cities created.\n\t
       $numCreatedInstitutions institutions created.\n\t
       $numCreatedRelations relations between entities created.\n\t
       $numSkippedCells cells skipped because of missing data\n\t
       $numSkippedRows of $numRows rows skipped because of missing data.\n");
    }


    /**
     * adds german and italian names to a country or city entity
     * @param string $name
     * @param mixed $existingTid
     * @param int $creatorTid
     * @param bool $verbose
     * @return void
     * @throws \APM\EntitySystem\Exception\InvalidObjectException
     * @throws \APM\EntitySystem\Exception\InvalidStatementException
     * @throws \APM\EntitySystem\Exception\InvalidSubjectException
     */
    private function addAltNamesToEntity(string $name, mixed $tid, int $entityType, int $creatorTid = -1, bool $verbose=true): void
    {

        // set system as the creator
        if ($creatorTid === -1) {
            $creatorTid = Entity::System;
        }

        // get alt. names from wikidata
        if ($entityType === Entity::tCountry) {
            $altNames = $this->getAltNamesForCountryFromWikidata($name);
        } else if ($entityType === Entity::tCity) {
            $altNames = $this->getAltNamesForCityFromWikidata($name);
        }

        // make statements to associate the alt. names to the entity
        if ($altNames !== []) {
            foreach ($altNames as $altName) {
                if ($altName['name'] !== '') {
                    $this->es->makeStatement($tid, Entity::pAlternateName, $altName['name'], $creatorTid, "Imported alt. name {$altName['name']} automatically.", [[Entity::pObjectLang, $altName['lang']]]);
                    if ($verbose) {
                        print("\tassociated: $name-->alternateName-->{$altName['name']} (lang {$altName['lang']}).\n");
                    }
                } else if ($verbose) {
                    print("\tNO alt. name for $name in wikidata in lang {$altName['lang']}.\n");
                }
            }
        } else if ($verbose) {
            print("\tNO alt. names found for $name in wikidata.\n");
        }
    }

    /**
     * creates document entities with predicates out of the dare documents table data
     * @param $verbose
     * @param int $creatorTid
     * @return int[]
     * @throws \APM\EntitySystem\Exception\InvalidObjectException
     * @throws \APM\EntitySystem\Exception\InvalidStatementException
     * @throws \APM\EntitySystem\Exception\InvalidSubjectException
     */
    private function createDocumentEntitiesWithPredicatesFromDareData($verbose=false, int $creatorTid=-1): array
    {

        $results = ['processedDocs' => 0, 'docsCreated' => 0, 'docsAlreadyExisted' => 0,  'setPredicates' => 0, 'skippedPredicates' => 0];

        // set system as the creator
        if ($creatorTid === -1) {
            $creatorTid = Entity::System;
        }

        // get all document data
        $documents = $this->getDataFromDareDocumentsTable();
        $numDocs = count($documents);

        print("There are $numDocs documents to process.\nThe processing begins after having collected all data.\n");

        if (!$verbose) {
            printf("   %d bilderberg ids processed\r", 0);
        }

        foreach ($documents as $i => $document) {

            // create document entity, if not already existing
            $bilderbergId = json_encode($document->bilderbergId);

            $createdDoc = $this->createDocument($bilderbergId);
            $tid = $createdDoc['tid'];

            if (str_starts_with($createdDoc['message'], 'NO')) {
               $results['docsAlreadyExisted']++;
            } else {
                $results['docsCreated']++;
            }

            $tableKeysToSkip = ['id', 'bilderbergId', 'repositoryId', 'vd16', 'edit16', 'iAureliensis', 'docEditor'];

            if ($verbose) {
                print("\tAdding predicates to document...\n");
            }

            // make statements
            foreach ($document as $predicate => $value) {

                if (!in_array($predicate, $tableKeysToSkip)) {

                    if ($predicate === 'materialType') {
                        switch ($value) {
                            case '1':
                                $value = Entity::MaterialPaper;
                                break;

                            case '2':
                                $value = Entity::MaterialParchment;
                                break;

                            case '3':
                                $value = Entity::MaterialMixed;
                                break;

                            case '4':
                                $value = Entity::MaterialVellum;
                                break;

                            case '5':
                                $value = Entity::MaterialTissue;
                                break;

                            default:
                                $value = 'unknown';
                                break;
                        }

                    }

                    if ($value === '' or $value === 'unknown' or $value === null) {
                        if ($verbose) {
                            print("\t\tskipping predicate $predicate because of empty value.\n");
                        }
                        $results['skippedPredicates']++;
                        continue;
                    }

                    $predicate = constant(Entity::class . '::pDare' . ucfirst($predicate));
                    $this->es->makeStatement($tid, $predicate, $value, $creatorTid, "Imported automatically from dare documents table.");
                    if ($verbose) {
                        print("\t\tvalue for predicate $predicate has been set.\n");
                    }

                    $results['setPredicates']++;
                }
            }

            if (!$verbose) {
                printf("   %d bilderberg ids processed\r", $i + 1);
            } else {
                $numRemainingDocs = $numDocs-($i+1);
                print("There are $numRemainingDocs documents to process.\n");
            }
            $results['processedDocs']++;
        }

        print("\nFINISHED!\n");
        return $results;
    }

    /**
     * reads the data from a csv table with a two-line header and returns them in an array
     * @param string $filename
     * @return array
     */
    private function readCsvWithDoubleHeaderToObjectArray(string $filename): array
    {
        $results = [];
        if (($handle = fopen($filename, "r")) !== FALSE) {
            $header1 = fgetcsv($handle);
            $header2 = fgetcsv($handle);

            // fill first header
            $filledHeader1 = [];
            $current = '';
            foreach ($header1 as $h) {
                $h = trim($h);
                if ($h !== '') $current = $h;
                $filledHeader1[] = $current;
            }

            // structure header
            $colCount = max(count($filledHeader1), count($header2));
            $colMap = [];
            for ($col = 0; $col < $colCount; $col++) {
                $parent = isset($filledHeader1[$col]) ? trim($filledHeader1[$col]) : '';
                $child = isset($header2[$col]) ? trim($header2[$col]) : '';
                if ($parent === '' && $child === '') {
                    continue;
                }
                if ($parent !== '' && $child === '') {
                    $colMap[$col] = [$this->toCamelCase($parent), null];
                } elseif ($parent !== '' && $child !== '' && $parent !== $child) {
                    $colMap[$col] = [$this->toCamelCase($parent), $this->toCamelCase($child)];
                } else {
                    $colMap[$col] = [$this->toCamelCase($child), null];
                }
            }

            // read data
            while (($data = fgetcsv($handle)) !== FALSE) {
                $row = new \stdClass();
                foreach ($colMap as $col => [$parent, $child]) {
                    if ($child === null) {
                        $row->{$parent} = $data[$col];
                    } else {
                        if (!isset($row->{$parent}) || !is_object($row->{$parent})) {
                            $row->{$parent} = new \stdClass();
                        }
                        $row->{$parent}->{$child} = $data[$col];
                    }
                }
                $results[] = $row;
            }
            fclose($handle);
        } else {
            echo "Error: Unable to open file $filename\n";
        }
        return $results;
    }

    /**
     * reads a csv file with a single header line and returns its contents as an object
     * @param $filename
     * @return array
     */
    public function readCsvWithSingleHeaderToObjectArray($filename): array
    {
        $results = [];

        if (($handle = fopen($filename, "r")) !== FALSE) {
            $headers = fgetcsv($handle); // Read header row
            while (($data = fgetcsv($handle)) !== FALSE) {
                $obj = new stdClass();
                foreach ($headers as $i => $header) {
                    $obj->{$this->toCamelCase($header)} = $data[$i];
                }
                $results[] = $obj;
            }
            fclose($handle);
        } else {
            echo "Error: Unable to open file $filename\n";
        }

        return $results;
    }

    /**
     * returns the data contained in the dare documents csv-table
     * @return array
     */
    private function getDataFromDareDocumentsTable() : array
    {
        $docsFromDareFile = "/var/apm/share/documents_dare.csv";
        return $this->readCsvWithSingleHeaderToObjectArray($docsFromDareFile);
    }

    /**
     * converts a string to camel case
     * @param string $string
     * @return string
     */
    private function toCamelCase(string $string): string
    {
        $string = preg_replace('/[^a-zA-Z0-9 ]+/', ' ', $string);
        $string = ucwords(strtolower($string));
        $string = str_replace(' ', '', $string);
        $string = lcfirst($string);
        return $string;
    }

}
