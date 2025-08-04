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
 * Commandline utility to create entities (documents, countries, cities, institutions) and predicates for them.
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

            case 'buildEverything':
                print("THIS WILL TAKE A WHILE (~1–2 hr)!\n--------- BUILDING LOCATIONS ---------\n");
                $this->createLocationEntitiesFromFile();

                print("\n--------- BUILDING DOCUMENTS ---------\n");
                $result = $this->createDocumentEntitiesWithPredicatesFromDareData();
                print_r($result);

                print("\n--------- ADDING SIGNATURES ---------\n");
                $this->addSignaturePredicateToDocsFromApm();

                print("\n--------- ASSOCIATING DOCUMENTS AND INSTITUTIONS ---------\n");
                $this->addStoredAtRelationToDocsFromApm();

                print("\n--------- FINISHED EVERYTHING! ---------\n");
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

            case 'addSignatures':
                if (!isset($argv[2])) {
                    $verbose = false;
                } else if ($argv[2] === "v") {
                    $verbose = true;
                } else {
                    print("The second argument can only be 'v' for verbose. You will find some help via 'entitymanager -h'.\n");
                    break;
                }
                $this->addSignaturePredicateToDocsFromApm($verbose);
                break;

            case 'associateDocsAndInstitutions':
                if (!isset($argv[2])) {
                    $verbose = false;
                } else if ($argv[2] === "v") {
                    $verbose = true;
                } else {
                    print("The second argument can only be 'v' for verbose. You will find some help via 'entitymanager -h'.\n");
                    break;
                }
                $this->addStoredAtRelationToDocsFromApm($verbose);
                break;

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
                $result = $this->createCity($argv[2], $argv[3]);
                print($result['message']);
                $this->addAltNamesToEntity($argv[2], $result['tid'], Entity::tCity);
                break;

            case 'createInstitution':
                $result = $this->createInstitution($argv[2], $argv[3], $argv[4]);
                print($result['message']);
                break;

            case 'createDocument':
                $result = $this->createDocument($argv[2]);
                print($result['message']);
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
  buildEverything - executes buildLocations, buildDocuments, addSignatures and associateDocsAndInstitutions. 
  
  buildLocations [v(erbose)] - creates country, city, institution and document entities from the data of the revised csv-file /var/apm/share/locationDataToBeRevised.csv, which was created by the locationdatagrabber collectEssentials command.
  buildDocuments [v(erbose)] - creates document entities with a lot of predicates, retrieved from the dare documents table saved as /var/apm/share/documents_dare.csv.
  
  addSignatures  [v(erbose)] - derives the library or archive signatures of all documents in the apm entity system from their names and saves them as predicates of the doc entities.
  associateDocsAndInstitutions  [v(erbose)] - adds a storedAt-relation with an institution as an object to each document entity depending on the location code in the document name.
  
  showEntity [tid] – shows information about an entity with the given tid
  createCountry [name]  - creates an entity of the type ,country‘ with the given english name and adds german and italian names as aliases automatically
  createCity [cityName] [countryName] - creates an entity of the type ,city‘ with the given english name and adds german and italian names automatically
  createInstitution [name] [cityName] [countryName] - creates an entity of the type ,institution‘ with the given english name
  createDocument [name] - creates an entity of the type ,document‘ for the given bilderberg id
END;

        print($help);
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

            printf("    %d table rows processed\r", $i);

            // extract relevant entity data
            $institutionName = '';
            $cityName = '';
            $countryName = '';
            $locationCode = $row->locationCodeCountryCityInstitution;
            $locationCodeSplitted = explode('-', $locationCode);

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
            if (!in_array($detectedTriple, $detectedTriples) or in_array('', $detectedTriple)) { // if not, process the triple

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

                        $this->es->makeStatement($countryTid, Entity::pDareCountryCode, $locationCodeSplitted[0], $creatorTid, "Adding country code $locationCodeSplitted[0] automatically.");
                        if ($verbose) {
                            print("\tassociated: $countryName-->pDareCountryCode-->$locationCodeSplitted[0]\n");
                        }

                    } else if ($verbose) {
                        print("\tcountry with name $countryName already created.\n");
                    }
                } else {
                    $numSkippedCells++;
                }

                if ($cityName !== '') {
                    if (!in_array($cityName.$countryName, $detectedCities) or $countryName === '') {
                        $result = $this->createCity($cityName, $countryName);
                        if ($verbose) {
                            print($result['message']);
                        }
                        $cityTid = $result['tid'];
                        if (!str_starts_with($result['message'], "\tNO")) {
                            $numCreatedCities++;
                        }
                        $this->addAltNamesToEntity($cityName, $cityTid, Entity::tCity, $creatorTid, $verbose);

                        $this->es->makeStatement($cityTid, Entity::pDareCityCode, $locationCodeSplitted[1], $creatorTid, "Adding city code $locationCodeSplitted[1] automatically.");
                        if ($verbose) {
                            print("\tassociated: $cityName-->pDareCityCode-->$locationCodeSplitted[1]\n");
                        }

                    } else if ($verbose) {
                        print("\tcity with name $cityName already created.\n");
                    }
                } else {
                    $numSkippedCells++;
                }

                if ($institutionName !== '') {
                    if (!in_array($institutionName.$cityName.$countryName, $detectedInstitutions) or $cityName === '' or $countryName === '') {
                        $result = $this->createInstitution($institutionName, $cityName, $countryName);
                        if ($verbose) {
                            print($result['message']);
                        }
                        $institutionTid = $result['tid'];
                        if (!str_starts_with($result['message'], "\tNO")) {
                            $numCreatedInstitutions++;
                        }

                        $this->es->makeStatement($institutionTid, Entity::pDareInstCode, $locationCodeSplitted[2], $creatorTid, "Adding institution code $locationCodeSplitted[2] automatically.");
                        if ($verbose) {
                            print("\tassociated: $institutionName-->pDareInstCode-->$locationCodeSplitted[2]\n");
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
                $detectedCities[] = $cityName . $countryName;
                $detectedInstitutions[] = $institutionName . $cityName . $countryName;

                // associate the entities to each other
                if (!($countryName === '' or $cityName === '')) {
                    $this->es->makeStatement($cityTid, Entity::pLocatedIn, $countryTid, $creatorTid, 'Associating city with country.');

                    $numCreatedRelations++;


                    if ($verbose) {
                        print("\tassociated: $cityName-->locatedIn-->$countryName.\n");
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
        print ("FINISHED!\n\t");
        print("$numCreatedCountries countries created.\n\t
       $numCreatedCities cities created.\n\t
       $numCreatedInstitutions institutions created.\n\t
       $numCreatedRelations relations between entities created.\n\t
       $numSkippedCells cells skipped because of missing data\n\t
       $numSkippedRows of $numRows rows skipped because of missing data.\n");
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

        $results = ['processedDocs' => 0, 'docsCreated' => 0, 'docsAlreadyExisted' => 0,  'setPredicates' => 0, 'skippedEmptyPredicates' => 0];

        // set system as the creator
        if ($creatorTid === -1) {
            $creatorTid = Entity::System;
        }

        // get all document data
        $documents = $this->getDataFromDareDocumentsTable();
        $numDocs = count($documents);

        print("There are $numDocs documents to process.\nThe processing begins after having collected all data.\n");

        if (!$verbose) {
            printf("   %d documents processed\r", 0);
        }

        foreach ($documents as $i => $document) {

            // create document entity, if not already existing
            $bilderbergId = json_encode($document->bilderbergId);
            $bilderbergIdSplitted = explode('-', $bilderbergId);
            $signatureFromBilderbergId = end($bilderbergIdSplitted);
            $signatureFromBilderbergId = str_replace('"', '', $signatureFromBilderbergId);

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

            if ($verbose) {
                $predicate = Entity::pDareSignature;
                print("\t\tvalue for predicate $predicate has been set.\n");
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
                        $results['skippedEmptyPredicates']++;
                        continue;
                    }

                    if ($predicate === 'idno') { // this is the library or archive signature

                        // depending on the relation of the saved signature to the signature encoded in the bilderberg id,
                        // save the signature as different predicates
                        if (!$this->signaturesAreIdentical($value, $signatureFromBilderbergId)) {
                            $predicate = constant(Entity::class . '::pDareSignature');

                            if ($verbose) {
                                print("\t\tsignature '$value' in dare doc table differs from the signature '$signatureFromBilderbergId' derived from the bilderberg id.\n");
                            }
                        } else {
                            $predicate = constant(Entity::class . '::pSignature');

                            if ($verbose) {
                                print("\t\tsignature $value in dare doc table identical with signature derived from the bilderberg id.\n");
                            }
                        }

                    } else {
                        $predicate = constant(Entity::class . '::pDare' . ucfirst($predicate));
                    }

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


    private function createCountry(string $name, int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tCountry, $name, '', $creatorTid, true);
    }

    private function createCity(string $name, string $countryName='', int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tCity, $name, '---'.$countryName.'---', $creatorTid, true);
    }

    private function createInstitution(string $name, string $cityName='', string $countryName='', int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tInstitution, $name, '---'.$cityName.'---'.$countryName.'---', $creatorTid, true);
    }

    private function createDocument(string $bilderbergId, int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tDocument, $bilderbergId, '', $creatorTid);
    }

    /**
     * Create an entity of a given type with a given name if it does not already exist.
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
    private function createEntityOfType(int $type, string $name, string $locatedIn='', int $creatorTid = -1, bool $addSortName = false): array
    {
        // set system as creator
        if ($creatorTid === -1) $creatorTid = Entity::System;

        // get all existing entities of the given type and for existing cities and institutions also their locations
        $entityNamesToTids = [];

        if ($this->existingEntities[$type] === []) { // if existingEntities have already been captured, do not do it again

            foreach ($this->es->getAllEntitiesForType($type) as $tid) { // iterate over all entities of the given type

                // get entity data and name
                $entityData = $this->es->getEntityData($tid);
                $entityName = $entityData->name;

                if ($type === Entity::tCity or $type === Entity::tInstitution) { // get the locations of cities or institutions

                    $locationEntity = $this->getEntityLocationFromSystem($entityData);
                    $location = $locationEntity['location'];
                    //print("location $location detected.\n");

                    if ($type === Entity::tInstitution and $location !== '') { // for institutions also get the country of the city in which the institution is located

                        $cityEntityTid = $locationEntity['tid'];
                        $cityEntityData = $this->es->getEntityData((int) $cityEntityTid);
                        $location = $location . '---' . $this->getEntityLocationFromSystem($cityEntityData)['location'];
                        //print("full location $location detected.\n");

                    }

                    $entityNamesToTids[$entityName.'---'.$location.'---'] = $tid;

                } else {
                    $entityNamesToTids[$entityName] = $tid;
                }
            }

            $this->existingEntities[$type] = $entityNamesToTids;

        } else {
            $entityNamesToTids = $this->existingEntities[$type];
        }


        // this array will be used for the return message
        $typeNames = [
            Entity::tCountry => 'country',
            Entity::tCity => 'city',
            Entity::tInstitution => 'institution',
            Entity::tDocument => 'document'];

        // if entity does not already exist, create it – always create cities and institutions without given location data
        if (!array_key_exists($name.$locatedIn, $entityNamesToTids) or
            (($type === Entity::tCity or $type === Entity::tInstitution) and str_contains($locatedIn, '------'))) {

            try {
                $tid = $this->es->createEntity($type, $name, '', $creatorTid);
                if ($addSortName) {
                    $this->es->makeStatement($tid, Entity::pSortName, $name, $creatorTid, "Adding sort name $name automatically.");
                }

            } catch (InvalidEntityTypeException) {
                throw new \RuntimeException("Invalid type, should never happen");
            }
            return ['message' => "\tcreated {$typeNames[$type]} $name (tid: $tid).\n", 'tid' => $tid];
        } else if (array_key_exists($name.$locatedIn, $entityNamesToTids)) {
            $existingTid = $entityNamesToTids[$name.$locatedIn];
            return ['message' => "\tNO {$typeNames[$type]} $name created, already exists (tid: $existingTid).\n", 'tid' => $existingTid];
        } else {
            return ['message' => "\tNO {$typeNames[$type]} $name created, REASON UNKNOWN.\n", 'tid' => null];
        }
    }

    /**
     * returns the tid and name of the locatedIn-object for the given entity data
     * @param object $entityData
     * @return array
     * @throws EntityDoesNotExistException
     */
    private function getEntityLocationFromSystem(object $entityData): array {

        $locatedInObjectTid = '';
        $location = '';

        $entityStatements = $entityData->statements;

        foreach ($entityStatements as $entityStatement) {
            if ($entityStatement->predicate === Entity::pLocatedIn) {
                $locatedInObjectTid = $entityStatement->object;
                $location = $this->es->getEntityData($locatedInObjectTid)->name;
                break;
            }
        }

        return ['tid' => $locatedInObjectTid, 'location' => $location];
    }


    private function getLocationCodesForInstitutionEntityFromSystem (object $entityData): array {

        $institutionCode = '';
        $cityCode = '';
        $countryCode = '';

        $entityStatements = $entityData->statements;

        foreach ($entityStatements as $entityStatement) {

            // get institution code
            if ($entityStatement->predicate === Entity::pDareInstCode) {
                $institutionCode = $entityStatement->object;
            }

            // get city code
            else if ($entityStatement->predicate === Entity::pLocatedIn) {
                $cityTid = $entityStatement->object;
                $cityStatements = $this->es->getEntityData($cityTid)->statements;

                foreach ($cityStatements as $cityStatement) {
                    if ($cityStatement->predicate === Entity::pDareCityCode) {
                        $cityCode = $cityStatement->object;
                    }

                    // get country code
                    else if ($cityStatement->predicate === Entity::pLocatedIn) {
                        $countryTid = $cityStatement->object;
                        $countryStatements = $this->es->getEntityData($countryTid)->statements;

                        foreach ($countryStatements as $countryStatement) {
                            if ($countryStatement->predicate === Entity::pDareCountryCode) {
                                $countryCode = $countryStatement->object;
                            }
                        }
                    }
                }
            }
        }

        return ['institutionCode' => $institutionCode, 'cityCode' => $cityCode, 'countryCode' => $countryCode];
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

    private function addSignaturePredicateToDocsFromApm ($verbose=false, $creatorTid=-1) {

        // set system as the creator
        if ($creatorTid === -1) {
            $creatorTid = Entity::System;
        }

        $numProcessedDocs=0;
        $numAddedSignatures=0;
        $numSkippedDocs=0;

        $docsFromApm = $this->getSystemManager()->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);
        $numFoundDocs = count($docsFromApm);

        print("found $numFoundDocs documents in the apm entity system.\n");

        foreach ($docsFromApm as $entityId) {

            $docInfo = $this->getSystemManager()->getDocumentManager()->getLegacyDocInfo((int) $entityId);
            $bilderbergId = $docInfo['title'];
            $bilderbergIdSplitted = explode('-', $bilderbergId);

            if ($bilderbergIdSplitted[0] === 'I' or $bilderbergIdSplitted[0] === 'M') {

                $signature = end($bilderbergIdSplitted);
                $this->es->makeStatement($entityId, Entity::pSignature, $signature, $creatorTid, "Derived automatically from the document title.");

                if ($verbose) {
                    print("\tassociated: $entityId (name: $bilderbergId)-->signature-->$signature\n");
                }
                $numAddedSignatures++;

            } else {
                if ($verbose) {
                    print("\tNO document signature found for $bilderbergId.\n");
                }
                $numSkippedDocs++;
            }

            $numProcessedDocs++;

            if (!$verbose) {
                printf("   %d docs processed\r", $numProcessedDocs);
            }

        }

        print("FINISHED!\n
                \t$numAddedSignatures signatures added.\n
                \t$numSkippedDocs skipped because of wrong title format.\n");

        return true;
    }


    private function addStoredAtRelationToDocsFromApm ($verbose=false, $creatorTid=-1) {

        // set system as the creator
        if ($creatorTid === -1) {
            $creatorTid = Entity::System;
        }

        $numProcessedDocs=0;
        $numAddedStoredAtRelations=0;
        $numSkippedDocs=0;

        $docsFromApm = $this->getSystemManager()->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);
        $numFoundDocs = count($docsFromApm);
        print("found $numFoundDocs documents in the apm entity system.\n");


        $institutionEntities = $this->getSystemManager()->getEntitySystem()->getAllEntitiesForType(Entity::tInstitution);
        $numInstitutionEntities = count($institutionEntities);
        print("found $numInstitutionEntities institution entities in the apm entity system.\n");

        $institutionEntityData = [];
        $locationCodes = [];

        print("collecting institution entities data and their location codes. this can take a moment...\n");
        foreach ($institutionEntities as $institutionTid) {
            $entityData = $this->es->getEntityData($institutionTid);
            $institutionEntityData[] =  $entityData;
            $locationCodes[] = $this->getLocationCodesForInstitutionEntityFromSystem($entityData);
        }


        foreach ($docsFromApm as $entityId) {

            $docInfo = $this->getSystemManager()->getDocumentManager()->getLegacyDocInfo((int) $entityId);
            $bilderbergId = $docInfo['title'];
            $bilderbergIdSplitted = explode('-', $bilderbergId);

            if ($bilderbergIdSplitted[0] === 'I' or $bilderbergIdSplitted[0] === 'M') {

                $countryCode = $bilderbergIdSplitted[1];
                $cityCode = $bilderbergIdSplitted[2];
                $instCode = $bilderbergIdSplitted[3];

                $institutionFound = false;

                foreach ($institutionEntities as $i=>$institutionTid) {

                    // get entity data and institution name
                    $entityData = $institutionEntityData[$i];
                    $institutionName = $entityData->name;

                    if ($locationCodes[$i]['institutionCode'] === $instCode and
                        $locationCodes[$i]['countryCode'] === $countryCode and
                        $locationCodes[$i]['cityCode'] === $cityCode) {

                        $this->es->makeStatement($entityId, Entity::pStoredAt, $institutionTid, $creatorTid, "Derived automatically from the document title.");
                        $numAddedStoredAtRelations++;
                        $institutionFound = true;

                        if ($verbose) {
                            print("\tassociated: $entityId (name: $bilderbergId)-->storedAt-->$institutionTid (name: $institutionName)\n");
                        }

                        break;
                    }
                }

                if (!$institutionFound) {
                    $numSkippedDocs++;

                    if ($verbose) {
                        print("\tNO institution entity found for $bilderbergId because of missing institution entity.\n");
                    }
                }

            } else {
                $numSkippedDocs++;

                if ($verbose) {
                    print("\tNO institution entity found for $bilderbergId because of wrong title format.\n");
                }
            }

            $numProcessedDocs++;

            if (!$verbose) {
                printf("   %d docs processed\r", $numProcessedDocs);
            }

        }

        print("FINISHED!\n
                \t$numAddedStoredAtRelations storedAt-relations added.\n
                \t$numSkippedDocs skipped because of wrong title format or missing institution entity.\n");

        return true;
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
     * checks if two given signatures contain identical information
     * @param string $signatureFromTable
     * @param string $signatureFromBilderbergId
     * @return bool
     */
    private function signaturesAreIdentical(string $signatureFromTable, string $signatureFromBilderbergId): bool {

        $signatureFromTable = str_replace(' ', '', strtolower($signatureFromTable));
        $signatureFromBilderbergId = str_replace(' ', '', strtolower($signatureFromBilderbergId));

        return str_replace('.', '', $signatureFromTable) ===
            str_replace('.', '', $signatureFromBilderbergId);
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
