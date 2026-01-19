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
use APM\EntitySystem\Schema\Languages;
use GuzzleHttp\Client as HttpClient;
use PHPUnit\Exception;
use stdClass;
use function PHPUnit\Framework\isType;

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
    private $bibTables;

    private array $existingEntities = [
        Entity::tCountry => [],
        Entity::tCity => [],
        Entity::tInstitution => [],
        Entity::tDocument => []
    ];

    private array $personTidsToNames = [];
    private array $personDareIdsToTids = [];
    private array $citiesToTids = [];

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
                print("THIS WILL TAKE A WHILE (~1–2 hr)!\n--------- BUILDING INSTITUTIONS ---------\n");
                $this->buildInstitutions();
                
                print("\n--------- BUILDING LOCATIONS ---------\n");
                $this->buildLocations();

                print("\n--------- BUILDING DOCUMENTS ---------\n");
                $result = $this->buildDocuments();
                print_r($result);

                print("\n--------- ADDING SIGNATURES TO DOCUMENTS ---------\n");
                $this->addSignaturePredicateToDocsFromApm();

                print("\n--------- ASSOCIATING DOCUMENTS AND INSTITUTIONS ---------\n");
                $this->addStoredAtRelationToDocsFromApm();

                print("\n--------- BUILDING BIBLIOGRAPHY ---------\n");
                $this->buildBibliography();

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
                $this->buildLocations($verbose);
                break;

            case 'buildInstitutions':
                if (!isset($argv[2])) {
                    $verbose = false;
                } else if ($argv[2] === "v") {
                    $verbose = true;
                } else {
                    print("The second argument can only be 'v' for verbose. You will find some help via 'entitymanager -h'.\n");
                    break;
                }
                $this->buildInstitutions($verbose);
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
                $result = $this->buildDocuments($verbose);
                print_r($result);
                break;

            case 'buildBibliography':
                if (!isset($argv[2])) {
                    $verbose = false;
                } else if ($argv[2] === "v") {
                    $verbose = true;
                } else {
                    print("The second argument can only be 'v' for verbose. You will find some help via 'entitymanager -h'.\n");
                    break;
                }
                $result = $this->buildBibliography($verbose);
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

            case 'addStoredAt':
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
  buildEverything - executes buildInstitutions, buildLocations, buildDocuments, addSignatures, associateDocsAndInstitutions and buildBibliography. 
  
  buildInstitutions [v(erbose)] - creates institution entities with predicates, retrieved from the dare repositories table saved as /var/apm/share/repositories_dare.csv.
  buildLocations [v(erbose)] - creates country, city, institution and document entities from the data of the revised csv-file /var/apm/share/locationDataToBeRevised.csv, which was created by the locationdatagrabber collectEssentials command.
  buildDocuments [v(erbose)] - creates document entities with a lot of predicates, retrieved from the dare documents table saved as /var/apm/share/documents_dare.csv.
  buildBibliography [v(erbose)] - creates bibliographic entry entities with a lot of predicates, retrieved from the dare bib-tables saved in /var/apm/share/.

  addSignatures  [v(erbose)] - derives the library or archive signatures of all documents in the apm entity system from their names and saves them as predicates of the doc entities.
  addStoredAt  [v(erbose)] - adds a storedAt-relation with an institution as an object to each document entity. which not already stands in such a relation, depending on the location code in the document name.
  
  showEntity [tid] – shows information about an entity with the given tid
  createCountry [name]  - creates an entity of the type ,country‘ with the given english name and adds german and italian names as aliases automatically
  createCity [cityName] [countryName] - creates an entity of the type ,city‘ with the given english name and adds german and italian names automatically
  createInstitution [name] [cityName] [countryName] - creates an entity of the type ,institution‘ with the given english name
  createDocument [name] - creates an entity of the type ,document‘ for the given bilderberg id
END;

        print($help);
    }

    /**
     * creates institution entities from the dare institutions table data
     * @param $verbose
     * @param int $creatorTid
     * @return void
     * @throws \APM\EntitySystem\Exception\InvalidObjectException
     * @throws \APM\EntitySystem\Exception\InvalidStatementException
     * @throws \APM\EntitySystem\Exception\InvalidSubjectException
     */
    private function buildInstitutions ($verbose=false, int $creatorTid=-1)
    {

        // set system as creator
        if ($creatorTid === -1) $creatorTid = Entity::System;

        if ($verbose) {
            print("getting institution data from dare...\n");
        }

        $institutionData = $this->getInstitutionsDataFromDare();
        $numInstitutions = count($institutionData);

        if ($verbose) {
            print("found $numInstitutions institutions.\n");
        }

        foreach ($institutionData as $i=>$institution) {


            $dareRepoId = $institution['id'];
            $name = $institution['name'];
            $instUrl = $institution['url'];
            $dnbUrl = $institution['dnb'];
            $viafUrl = $institution['viaf'];
            $instCode = $institution['instCode'];
            $cityCode = $institution['cityCode'];
            $countryCode = $institution['countryCode'];
            $locationCode = $countryCode.'-'.$cityCode.'-'.$instCode;

            // create institution
            $instEntityTid = $this->createInstitution($name, checkExisting: false)['tid'];

            if ($verbose) {
                print("\tcreated institution $name with tid $instEntityTid.\n");
            }

            // add predicates
            $this->es->makeStatement($instEntityTid, Entity::pDareRepositoryId, $dareRepoId, $creatorTid, "Automatically grabbed from dare database.");
            if ($verbose) {
                print("\tassociated: pDareRepositoryId->$dareRepoId.\n");
            }


            if (trim($instUrl) !== '') {

                if (str_starts_with($instUrl, 'www')) {$instUrl = 'http://'.$instUrl;}

                $this->es->makeStatement($instEntityTid, Entity::pUrl, $instUrl, $creatorTid, "Automatically grabbed from dare database.");

                if ($verbose) {
                    print("\tassociated: pUrl->$instUrl.\n");
                }
            }

            if (trim($dnbUrl) !== '') {
                $this->es->makeStatement($instEntityTid, Entity::pUrl, $dnbUrl, $creatorTid, "Automatically grabbed from dare database.", [[Entity::pObjectUrlType, Entity::UrlTypeDnb]]);
                if ($verbose) {
                    print("\tassociated: pUrl->$dnbUrl.\n");
                }
            }

            if (trim($viafUrl) !== '') {
                $this->es->makeStatement($instEntityTid, Entity::pUrl, $viafUrl, $creatorTid, "Automatically grabbed from dare database.", [[Entity::pObjectUrlType, Entity::UrlTypeViaf]]);
                if ($verbose) {
                    print("\tassociated: pUrl->$viafUrl.\n");
                }
            }

            if (!(str_starts_with($locationCode, '-') or str_ends_with($locationCode, '-') or str_contains($locationCode, '--'))) {
                $this->es->makeStatement($instEntityTid, Entity::pDareInstCode, $instCode, $creatorTid, "Automatically grabbed from dare database.");
                $this->es->makeStatement($instEntityTid, Entity::pDareLongInstCode, $locationCode, $creatorTid, "Automatically grabbed from dare database.");
                if ($verbose) {
                    print("\tassociated: pDareLongInstCode->$locationCode.\n");
                }
            }

            $j = $i+1;
            if (!$verbose) {
                printf("   %d institution(s) processed\r", $j);
            } else {
                print("$j institution(s) processed.\n");
            }

        }
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
    private function buildLocations(bool $verbose=false, int $creatorTid = -1): void
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

        // get existing institutions with their location codes
        print("Collecting the data...\n");
        $locationCodesToInstitutionTids = $this->getLocationCodesForInstitutionEntities();
        
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
            $locationCode = trim($row->locationCodeCountryCityInstitution);
            $locationCodeSplitted = explode('-', $locationCode);
            $countryCode = $locationCodeSplitted[0];
            $cityCode = $locationCodeSplitted[1];
            $instCode = $locationCodeSplitted[2];
            $longCityCode = $countryCode . '-' . $cityCode;

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

                        $this->es->makeStatement($countryTid, Entity::pDareCountryCode, $countryCode, $creatorTid, "Adding country code $countryCode automatically.");
                        if ($verbose) {
                            print("\tassociated: $countryName-->pDareCountryCode-->$countryCode\n");
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

                        $this->es->makeStatement($cityTid, Entity::pDareCityCode, $cityCode, $creatorTid, "Adding city code $cityCode automatically.");
                        $this->es->makeStatement($cityTid, Entity::pDareLongCityCode, $longCityCode, $creatorTid, "Adding long city code $cityCode automatically.");

                        if ($verbose) {
                            print("\tassociated: $cityName-->pDareCityCode-->$cityCode\n");
                        }

                    } else if ($verbose) {
                        print("\tcity with name $cityName already created.\n");
                    }
                } else {
                    $numSkippedCells++;
                }

                if ($institutionName !== '' and !isset($locationCodesToInstitutionTids[$locationCode])) {
                    if (!in_array($institutionName.$cityName.$countryName, $detectedInstitutions)
                            or $cityName === '' or $countryName === '') {
                        $result = $this->createInstitution($institutionName, $cityName, $countryName);
                        if ($verbose) {
                            print($result['message']);
                        }
                        $institutionTid = $result['tid'];
                        if (!str_starts_with($result['message'], "\tNO")) {
                            $numCreatedInstitutions++;
                        }

                        $this->es->makeStatement($institutionTid, Entity::pDareInstCode, $instCode, $creatorTid, "Adding institution code $instCode automatically.");
                        $this->es->makeStatement($institutionTid, Entity::pDareLongInstCode, $locationCode, $creatorTid, "Adding location code $locationCode automatically.");

                        if ($verbose) {
                            print("\tassociated: $institutionName-->pDareInstCode-->$instCode\n");
                            print("\tassociated: $institutionName-->pDareLongInstCode-->$locationCode\n");
                        }

                    } else if ($verbose) {
                        print("\tinstitution with name $institutionName already created in this process.\n");
                    }
                } else if (isset($locationCodesToInstitutionTids[$locationCode])) {

                    if ($verbose) {
                        print("\tinstitution with name $institutionName already created from dare institutions table.\n");
                    }

                    $institutionTid = $locationCodesToInstitutionTids[$locationCode];
                }
                else {
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
        print ("\nFINISHED!\n\t");
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
    private function buildDocuments($verbose=false, int $creatorTid=-1): array
    {

        $results = ['processedDocs' => 0, 'docsCreated' => 0, 'docsAlreadyExisted' => 0,  'setPredicates' => 0, 'skippedEmptyPredicates' => 0];

        // set system as the creator
        if ($creatorTid === -1) {
            $creatorTid = Entity::System;
        }

        // get all document data
        $documents = $this->getDataFromDareDocumentsTable();
        $docLangs = $this->getDataFromDareDocLanguageTable();
        $numDocs = count($documents);

        print("There are $numDocs documents to process.\nCollecting the data...\n");

        if (!$verbose) {
            printf("   %d documents processed\r", 0);
        }

        foreach ($documents as $i => $document) {

            // create document entity, if not already existing
            $bilderbergId = json_encode($document->bilderbergId);
            $bilderbergIdSplitted = explode('-', $bilderbergId);
            $signatureFromBilderbergId = end($bilderbergIdSplitted);
            $signatureFromBilderbergId = str_replace('"', '', $signatureFromBilderbergId);

            $createdDoc = $this->createDocument(str_replace('"', '', $document->bilderbergId));
            $tid = $createdDoc['tid'];

            $institutions = $this->es->getAllEntitiesForType(Entity::tInstitution);

            if (str_starts_with($createdDoc['message'], 'NO')) {
                $results['docsAlreadyExisted']++;
            } else {
                $results['docsCreated']++;
            }

            $tableKeysToSkip = ['id', 'bilderbergId', 'vd16', 'edit16', 'iAureliensis', 'docEditor'];

            if ($verbose) {
                print("\tProcessing $bilderbergId...\n");
            }

            // make statements
            foreach ($document as $predicate => $value) {

                if (!in_array($predicate, $tableKeysToSkip)) {

                    // get entity for materialType
                    if ($predicate === 'materialType') {
                        $value = $this->getEntityForDareMaterialCode($value);
                    }

                    // skip empty values
                    if ($value === '' or $value === 'unknown' or $value === null) {
                        if ($verbose) {
                            print("\t\t\tskipping predicate $predicate because of empty value.\n");
                        }
                        $results['skippedEmptyPredicates']++;
                        continue;
                    }

                    // GET CORRECT PREDICATE NAMES AND ENTITIES
                    if ($predicate === 'idno') { // this is the library or archive signature

                        // depending on the relation of the saved signature to the signature encoded in the bilderberg id,
                        // save the signature as different predicates
                        if (!$this->signaturesAreIdentical($value, $signatureFromBilderbergId)) {
                            $predicateName =  'pDareSignature';

                            if ($verbose) {
                                print("\t\t\tsignature '$value' in dare doc table differs from the signature '$signatureFromBilderbergId' derived from the bilderberg id.\n");
                            }
                        } else {
                            $predicateName =  'pSignature';

                            if ($verbose) {
                                print("\t\t\tsignature $value in dare doc table identical with signature derived from the bilderberg id.\n");
                            }
                        }

                        $predicate = constant(Entity::class . '::' . $predicateName);

                    }

                    else if ($predicate === 'type') {
                        $predicateName =  'pDocumentType';
                        $predicate = constant(Entity::class . '::' . $predicateName);

                        if (trim($value) === 'ms') {
                            $value = Entity::DocTypeManuscript;
                        } else if (trim($value) === 'inc') {
                            $value = Entity::DocTypeIncunabulum;
                        }
                    }

                    else {
                        $predicateName =  'pDare' . ucfirst($predicate);
                        $predicate = constant(Entity::class  . '::' . $predicateName);
                    }

                    // MAKE STATEMENTS
                    if ($predicate !== Entity::pDareRepositoryId) {
                        $this->es->makeStatement($tid, $predicate, $value, $creatorTid, "Imported automatically from dare documents table.");

                        if ($verbose) {
                            print("\t\tassociated: $predicateName -> $value\n");
                        }
                    }

                    // add storedAt-relation based on the given pDareRepositoryId of the doc
                    else {

                        foreach ($institutions as $institutionTid) {
                            $entityData = $this->es->getEntityData($institutionTid);

                            foreach ($entityData->statements as $statement) {

                                if ($statement->predicate === Entity::pDareRepositoryId) {

                                    if ($statement->object === $value) {
                                        $this->es->makeStatement($tid, Entity::pStoredAt, $institutionTid, $creatorTid, "Imported automatically from dare documents table, concluded from the dare repo id.");

                                        if ($verbose) {
                                            $institutionName = $entityData->name;
                                            print("\t\tassociated: storedAt -> $institutionName ($institutionTid).\n");
                                        }
                                    }

                                    break;
                                }
                            }
                        }
                    }

                    $results['setPredicates']++;
                }
            }

            // add language predicate
            $predicate = Entity::pDocumentLanguage;

            foreach ($docLangs as $entry) {
                if ($entry->docId === $document->id) {

                    $langData = $this->getEntityForDareLanguageCode($entry->languageId);
                    $langName = $langData['name'];
                    $langTid = $langData['tid'];

                    $this->es->makeStatement($tid, $predicate, $langTid, $creatorTid, "Imported automatically from dare documents table.");

                    if ($verbose) {
                        print("\t\tassociated: pDocumentLanguage -> $langName ($langTid)\n");
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


    private function buildBibliography ($verbose=false, $creatorTid=-1): void {

        // set system as creator
        if ($creatorTid === -1) $creatorTid = Entity::System;

        if ($verbose) {
            print("\tcollecting bib data from dare tables...\n");
        }
        $this->collectDataFromDareBibTables();

        // process data from reprint table for later use
        $isReprintOfEntry = [];
        foreach ($this->bibTables->reprint as $reprintEntry) {
            $isReprintOfEntry[$reprintEntry->reprintIn] = ['reprintOf' => $reprintEntry->reprintOf, 'reprintType' => $reprintEntry->reprintType];
        }

        // process tags for later use
        $entryIdsToTags = [];
        foreach($this->bibTables->entryCategory as $entryIdAndCategory) {
            $entryId = $entryIdAndCategory->bibEntryId;
            $categoryId = $entryIdAndCategory->categoryId;

            foreach ($this->bibTables->category as $categoryIdAndCategory) {
                if ($categoryId === $categoryIdAndCategory->id) {
                    if (!isset($entryIdsToTags[$entryId])) {
                        $entryIdsToTags[$entryId] = [$categoryIdAndCategory->categoryName];
                    } else {
                        $entryIdsToTags[$entryId][] = $categoryIdAndCategory->categoryName;
                    }
                }
            }
        }

        if ($verbose) {
            print("\tbib data collected.\n");
            print("\tcollecting relevant data from entity system...\n");
        }

        // collecting language data
        $langCodesToEntities = [];
        $langs = new Languages();
        $langEntitiesAndCodes = $langs->getStatements();
        foreach ($langEntitiesAndCodes as $langEntityAndCode) {
            $langCodesToEntities[$langEntityAndCode[2]] = $langEntityAndCode[0];
        }

        // collect existing persons in entity system
        $existingPersons = $this->es->getAllEntitiesForType(Entity::tPerson);
        foreach ($existingPersons as $personTid) {
            $this->personTidsToNames[$personTid] = $this->es->getEntityName($personTid);

            // get dare person ids
            $personData = $this->es->getEntityData($personTid);
            $entityStatements = $personData->statements;
            foreach ($entityStatements as $entityStatement) {
                if ($entityStatement->predicate === Entity::pDarePersonId) {
                    $this->personDareIdsToTids[$entityStatement->object] = $personTid;
                }
            }
        }

        // collect existing cities in entity system
        $existingCities = $this->es->getAllEntitiesForType(Entity::tCity);
        foreach ($existingCities as $cityTid) {
            $this->citiesToTids[$this->es->getEntityName($cityTid)] = $cityTid;
        }


        if ($verbose) {
            print("\tentity data collected.\n");
            print("\tcreating representations from dare table in entity system...\n");
        }
        $representationEntryIdsToTids = $this->createRepresentationsFromDare($verbose, $creatorTid);

        if ($verbose) {
            print("\n\tcreating bib objects...\n");
        }

        // create container arrays
        $alreadyCreatedEntryIdsToTids = [];
        $publisherNamesToTids = [];
        $bookSeriesToTids = [];

        $numBibEntries = count($this->bibTables->entry);

        foreach ($this->bibTables->entry as $i=>$bibEntry) {

            $bibEntriesProcessed = $i+1;

//            if ($bibEntry->id <= 300) {
//                continue;
//            }

            // get type of bib object
            $type = $this->getBibObjectType($bibEntry->type);

            // get lang entity and tags
            $lang = $langCodesToEntities[$bibEntry->language] ?? "";
            $tags = $entryIdsToTags[$bibEntry->id] ?? [];

            // handle empty titles, seldom necessary
            if (!isset($bibEntry->title) or trim($bibEntry->title) === "") {$bibEntry->title = "untitled";}

            // create entity of a specific bib type if not already created
            if (!isset($alreadyCreatedEntryIdsToTids[$bibEntry->id])) {
                $tid = $this->es->createEntity($type, $bibEntry->title, '', $creatorTid);
                if ($verbose) {
                    print("\n\tcreated entity $bibEntriesProcessed of $numBibEntries, of type $type with tid $tid\n");
                }
            } else {
                $tid = $alreadyCreatedEntryIdsToTids[$bibEntry->id];
                if ($verbose) {
                    print("\tentity of type $type already created in processing another entry\n");
                }
            }

            // SET NON-TYPE-SPECIFIC PREDICATES
            $this->makeBibObjectStatement($tid, Entity::pTitle, $bibEntry->title, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pDareBibEntryId, $bibEntry->id, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pDareId, $bibEntry->dareIdno, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pDareCatalogId, $bibEntry->catalogIdno, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pBibObjectLang, $lang, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pDareBibEntryVolume, $bibEntry->volume, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pTransliteratedTitle, $bibEntry->titleTranscript, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pTranslatedTitle, $bibEntry->titleTranslation, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pShortTitle, $bibEntry->shortTitle, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pAbstract, $bibEntry->abstract, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pUrl, explode(" ", $bibEntry->onlineUrl)[0], $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pDoi, $bibEntry->doiUrl, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pDareIsCatalog, $bibEntry->isCatalog, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pDareInBibliography, $bibEntry->inBibliography, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pDareIsInactive, $bibEntry->isInactive, $creatorTid);
            $this->makeBibObjectStatement($tid, Entity::pDareEntryType, $bibEntry->entryType, $creatorTid);



            // set tags
            foreach ($tags as $tag) {
                $this->makeBibObjectStatement($tid, Entity::pTag, $tag, $creatorTid);
            }


            $tags = implode(", ", $tags) ?? "";

            if ($verbose) {
                print("\t
                    pTitle --> $bibEntry->title,
                    pDareBibEntryId --> $bibEntry->id,
                    pDareId --> $bibEntry->dareIdno,
                    pDareCatalogId --> $bibEntry->catalogIdno,
                    pBibObjectLang --> $lang,
                    pTag --> $tags,
                    pTransliteratedTitle --> $bibEntry->titleTranscript,
                    pTranslatedTitle --> $bibEntry->titleTranslation,
                    pShortTitle --> $bibEntry->shortTitle,
                    pDareBibEntryVolume --> $bibEntry->volume,
                    pAbstract --> $bibEntry->abstract,
                    pUrl --> $bibEntry->onlineUrl,
                    pDoiUrl --> $bibEntry->doiUrl,
                    pDareIsCatalog --> $bibEntry->isCatalog,
                    pDareInBibliography --> $bibEntry->inBibliography,
                    pDareIsInactive --> $bibEntry->isInactive,
                    pDareEntryType --> $bibEntry->entryType,
                \n");
            }

            $this->setReprintData($tid, $bibEntry, $isReprintOfEntry, $verbose, $creatorTid);
            $this->setAuthorsEditorsTranslators($tid, $bibEntry, $verbose, $creatorTid);
            $this->setReviewData($tid, $bibEntry, $verbose, $creatorTid);
            $this->setRepresentationData($tid, $bibEntry, $representationEntryIdsToTids, $verbose, $creatorTid);

            // SET TYPE-SPECIFIC PREDICATES

            switch ($type) {

                case Entity::tBookSection:

                    // set pPages
                    foreach ($this->bibTables->bookSection as $sectionEntry) {
                        if ($sectionEntry->id === $bibEntry->id) {
                            $this->makeBibObjectStatement($tid, Entity::pPages, $sectionEntry->pages, $creatorTid);

                            if ($verbose) {
                                print("\t\tpPages --> $sectionEntry->pages,\n");
                            }

                            // set rContainedIn
                            try { // make rContainedIn statement if section entity was created after the container book entity
                                $booksInEs = $this->es->getAllEntitiesForType(Entity::tBook);
                                foreach ($booksInEs as $bookTid) {
                                    $entityData = $this->es->getEntityData($bookTid);
                                    $name = $entityData->name;
                                    $entityStatements = $entityData->statements;
                                    foreach ($entityStatements as $entityStatement) {
                                        if ($entityStatement->predicate === Entity::pDareBibEntryId) {
                                            if ($entityStatement->object === $sectionEntry->sectionOf) {
                                                $this->makeBibObjectStatement($tid, Entity::rContainedIn, $bookTid, $creatorTid);
                                                if ($verbose) {
                                                    print("\t\trContainedIn --> $bookTid ($name),\n");
                                                }

                                            }
                                        }
                                    }
                                }
                            } catch (Exception) {
                            }

                        }
                    }

                    break;

                case Entity::tBook:

                    // set publication date
                    $this->makeBibObjectStatement($tid, Entity::pPublicationDate, $bibEntry->freeDate, $creatorTid);

                    if ($verbose) {
                        print("\t\t\tpPublicationDate --> $bibEntry->freeDate,\n");
                    }

                    // set publisher, publication place, series, volume and edition
                    foreach ($this->bibTables->book as $bookEntry) {
                        if ($bookEntry->id === $bibEntry->id) {
                            if (isset($bookEntry->publisher) and !trim($bookEntry->publisher) == "") {

                                $publisherName = trim($bookEntry->publisher);

                                if (isset($publisherNamesToTids[$publisherName])) {
                                    $publisherTid = $publisherNamesToTids[$publisherName];
                                } else {
                                    $publisherTid = $this->es->createEntity(Entity::tPublisher, $publisherName, "Imported automatically from the dare database.", $creatorTid);
                                    $publisherNamesToTids[$publisherName] = $publisherTid;
                                }

                                $this->makeBibObjectStatement($tid, Entity::rPublishedBy, $publisherTid, $creatorTid);


                                if ($verbose) {
                                    print("\t\t\tpPublisher --> $bookEntry->publisher,\n");
                                }
                            }
                            if (isset($bookEntry->pubplace)) {

                                // extract city names from table entry
                                $pubPlaces = explode("(", $bookEntry->pubplace)[0];
                                $pubPlaces = explode("[", $pubPlaces)[0];
                                $citySeparators = '/[,\/\-]/';
                                $pubPlaces = preg_split($citySeparators, $pubPlaces, -1, PREG_SPLIT_NO_EMPTY);

                                if (isset($pubPlaces[0])) {
                                    if ($pubPlaces[0] === "Louvain") {
                                        $pubPlaces = ["Louvain-la-Neuve"];
                                    }

                                    foreach ($pubPlaces as $pubPlace) {
                                        $pubPlace = trim($pubPlace);

                                        if (isset($this->citiesToTids[$pubPlace])) {
                                            $pubPlaceTid = $this->citiesToTids[$pubPlace];
                                            $this->makeBibObjectStatement($tid, Entity::rPubPlace, $pubPlaceTid, $creatorTid);

                                            if ($verbose) {
                                                print("\t\t\trPubPlace --> $pubPlace,\n");
                                            }
                                        } else {
                                            $this->makeBibObjectStatement($tid, Entity::pPubPlace, $pubPlace, $creatorTid);

                                            if ($verbose) {
                                                print("\t\t\tpPubPlace --> $pubPlace,\n");
                                            }
                                        }
                                    }
                                }
                            }
                            if (isset($bookEntry->volume)) {
                                $this->makeBibObjectStatement($tid, Entity::pContainerVolume, $bookEntry->volume, $creatorTid);

                                if ($verbose) {
                                    print("\t\t\tpContainerVolume --> $bookEntry->volume,\n");
                                }
                            }
                            if (isset($bookEntry->editionNo)) {
                                $this->makeBibObjectStatement($tid, Entity::pEdition, $bookEntry->editionNo, $creatorTid);

                                if ($verbose) {
                                    print("\t\t\tpEdition --> $bookEntry->editionNo,\n");
                                }
                            }

                            if (isset($bookEntry->bookSeries)) {

                                $bookSeries = trim($bookEntry->series);

                                if (!isset($bookSeriesToTids[$bookSeries])) {
                                    $bookSeriesTid = $this->es->createEntity(Entity::tBookSeries, $bookSeries, "", $creatorTid);
                                    if ($verbose) {
                                        print("\t\tcreated new book series $bookEntry->series ($bookSeriesTid)\n");
                                    }
                                    $bookSeriesToTids[$bookSeries] = $bookSeriesTid;
                                } else {
                                    $bookSeriesTid = $bookSeriesToTids[$bookSeries];
                                }

                                $this->makeBibObjectStatement($tid, Entity::rContainedIn, $bookSeriesTid, $creatorTid);
                                if ($verbose) {
                                    print("\t\trContainedIn --> $bookSeriesTid ($bookEntry->series),");
                                }
                            }
                        }
                    }

                    // set rContainedIn for already created book section
                    foreach ($this->bibTables->bookSection as $sectionEntry) {
                        if ($sectionEntry->sectionOf === $bibEntry->id) {
                            try {
                                $sectionsInEs = $this->es->getAllEntitiesForType(Entity::tBookSection);
                                foreach ($sectionsInEs as $sectionTid) {
                                    $entityData = $this->es->getEntityData($sectionTid);
                                    $name = $entityData->name;
                                    $entityStatements = $entityData->statements;
                                    foreach ($entityStatements as $entityStatement) {
                                        if ($entityStatement->predicate === Entity::pDareBibEntryId) {
                                            if ($entityStatement->object === $bibEntry->id) {
                                                $this->makeBibObjectStatement($sectionTid, Entity::rContainedIn, $tid, $creatorTid);
                                                if ($verbose) {
                                                    print("\t\t$sectionTid ($name) --> rContainedIn,");
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (Exception) {
                            }
                        }
                    }

                    break;

                case Entity::tArticle:

                    // set publication date
                    $this->makeBibObjectStatement($tid, Entity::pPublicationDate, $bibEntry->freeDate, $creatorTid);

                    if ($verbose) {
                        print("\t\tpPublicationDate --> $bibEntry->freeDate,");
                    }

                    // set volume, issue, pages and journal
                    foreach ($this->bibTables->article as $articleEntry) {
                        if ($articleEntry->id === $bibEntry->id) {
                            $this->makeBibObjectStatement($tid, Entity::pContainerVolume, $articleEntry->volume, $creatorTid);
                            $this->makeBibObjectStatement($tid, Entity::pContainerIssue, $articleEntry->issue, $creatorTid);
                            $this->makeBibObjectStatement($tid, Entity::pPages, $articleEntry->pages, $creatorTid);

                            if ($verbose) {
                                print("\t\tpContainerVolume --> $articleEntry->volume,
                                           pContainerIssue --> $articleEntry->issue,
                                           pPages --> $articleEntry->pages,
                                ");
                            }

                            if ($verbose) {print("\t\tcollect all entities of type journal...");}
                            $journalsInEs = $this->es->getAllEntitiesForType(Entity::tJournal);
                            $journalTid = null;
                            foreach ($journalsInEs as $journal) {
                                $entityData = $this->es->getEntityData($journal);
                                $journalName = $entityData->name;

                                if ($journalName === $articleEntry->journalName) {
                                    $journalTid = $journal;
                                    break;
                                }
                            }

                            if ($journalTid === null) {
                                $journalTid = $this->es->createEntity(Entity::tJournal, $articleEntry->journalName, "", $creatorTid);
                                if ($verbose) {print("\t\tcreated new journal $articleEntry->journalName ($journalTid)\n");}
                            }

                            $this->makeBibObjectStatement($tid, Entity::rContainedIn, $journalTid, $creatorTid);
                            if ($verbose) {
                                print("\t\trContainedIn --> $journalTid ($articleEntry->journalName)\n");
                            }
                        }

                        break;

                    }
            }

            printf("\t$bibEntriesProcessed of $numBibEntries bib entries processed.\r", $bibEntriesProcessed);
        }

        print("BUILDING BIBLIOGRAPHY DONE.");

    }

    private function createRepresentationsFromDare(bool $verbose, int $creatorTid): array {

        // collect works and their codes from the apm es
        $workIdsToTids = [];
        $works = $this->es->getAllEntitiesForType(Entity::tWork);
        $numWorks = count($works);

        print("\tcollecting works from apm entity system...\n");
        foreach ($works as $i=>$work) {
                $workData = $this->es->getEntityData($work);
                foreach ($workData->statements as $statement) {
                    if ($statement->predicate === Entity::pApmWorkId) {
                        $workId = $statement->object;
                        $workIdsToTids[$workId] = $work;
                    }
                    printf("\t\t$i of $numWorks works in dare collected.\r", $i);
                }
        }

        $representationEntryIdsToTids = [];
        $numNewPersons = 0;
        $numRepresentations = count($this->bibTables->work);

        foreach ($this->bibTables->work as $i=>$representation) { // create representations from dare
            if ($representation->type === "averroes") {

                $workId = explode("_", $representation->repId)[0];

                $representationTid = $this->es->createEntity(Entity::tRepresentation, $representation->repTitle, '', $creatorTid);
                $this->makeBibObjectStatement($representationTid, Entity::pDareRepresentedWorkId, $representation->repId, $creatorTid);
                $this->makeBibObjectStatement($representationTid, Entity::rRepresents, $workIdsToTids[$workId], $creatorTid);

                $representationEntryIdsToTids[$representation->id] = $representationTid;

                switch ($representation->language) {
                    case 1:
                        $language = Entity::LangLatin;
                        break;
                    case 2:
                        $language = Entity::LangHebrew;
                        break;
                    case 3:
                        $language = Entity::LangArabic;
                        break;
                    default:
                        $language = null;
                        break;
                }

                if ($language !== null) {
                        $this->makeBibObjectStatement($representationTid, Entity::pRepresentationLang, $language, $creatorTid);
                    }

                // add the translator of the representation
                if (isset($representation->translator) and $representation->translator !== "") {

                    $translatorExists = false;

                    foreach ($this->personTidsToNames as $personTid=>$personName) {
                        if ($personName === $representation->translator) {
                            $this->makeBibObjectStatement($personTid, Entity::rTranslatorOf, $representationTid, $creatorTid);
                            $translatorExists = true;
                            break;
                        }
                    }

                    if (!$translatorExists) {
                        $person = $this->es->createEntity(Entity::tPerson, $representation->translator, '', $creatorTid);
                        $this->makeBibObjectStatement($person, Entity::rTranslatorOf, $representationTid, $creatorTid);
                        $this->personTidsToNames[$person] = $representation->translator;
                        $numNewPersons++;
                    }
                }
            }

            $representationsProcessed = $i+1;
            printf("\t\t$representationsProcessed of $numRepresentations representations in dare collected.\r", $representationsProcessed);

        }

        if ($verbose) {
            print("\n\t\tcreated $numNewPersons persons (work translators) while processing works.");
        }

        return $representationEntryIdsToTids;

    }


    private function makeBibObjectStatement (int $subject, int $predicate, $object, int $creatorTid, array $qualifications=[]): bool
    {

        if (is_string($object)) {
            $object = trim($object);
        }


        if ($object !== "" and $object !== null) {
            if ($qualifications === []) {
                $this->es->makeStatement($subject, $predicate, $object, $creatorTid, "Imported automatically from dare database.");
            } else {
                $this->es->makeStatement($subject, $predicate, $object, $creatorTid, "Imported automatically from dare database.", $qualifications);
            }
        }

        return true;
    }

    private function setReprintData(int $reprintTid, object $bibEntry, array $isReprintOfEntry, bool $verbose, int $creatorTid) {

        $existingBooks = $this->es->getAllEntitiesForType(Entity::tBook);
        $existingArticles = $this->es->getAllEntitiesForType(Entity::tArticle);
        $existingBookSections = $this->es->getAllEntitiesForType(Entity::tBookSection);
        $existingBibObjects = array_merge($existingBooks, $existingArticles, $existingBookSections);

        // set reprintOf and reprintType
        foreach ($this->bibTables->entry as $entry) { // check of which entry the current entry is a reprint, if of any
            if (
                    (isset($bibEntry->republicationOf) or isset($isReprintOfEntry[$bibEntry->id]['reprintOf'])) and
                (($bibEntry->republicationOf ?? null) === $entry->id or ($isReprintOfEntry[$bibEntry->id]['reprintOf'] ?? null) === $entry->id)
            ) {

                if ($entry->id < $bibEntry->id) { // reprintOf entry already created as an entity, get this entity

                    if ($verbose) {
                        print("\t\treprintOf entry already created as an entity. getting entity...\n");
                    }

                    foreach ($existingBibObjects as $bibObjectTid) {

                        $entityData = $this->es->getEntityData($bibObjectTid);
                        $entityStatements = $entityData->statements;

                        foreach ($entityStatements as $entityStatement) {
                            if ($entityStatement->predicate === Entity::pDareBibEntryId) {
                                if ($entityStatement->object === $entry->id) {
                                    $reprintedTid = $bibObjectTid;

                                    $this->makeBibObjectStatement($reprintTid, Entity::rReprintOf, $reprintedTid, $creatorTid);
                                    if ($verbose) {
                                        print("\t\trReprintOf --> $reprintedTid,\n");
                                    }

                                    $reprintType = $isReprintOfEntry[$bibEntry->id]['reprintType'] ?? null;
                                    if ($reprintType !== null) {
                                        $this->makeBibObjectStatement($reprintTid, Entity::pDareReprintType, $reprintType, $creatorTid);
                                        if ($verbose) {
                                            print("\t\tpDareReprintType--> $reprintType");
                                        }
                                    }

                                    break;
                                }
                            }
                        }
                    }

                } else { // reprintOf entry not yet created as an entity, do that

                    if ($verbose) {
                        print("\t\treprintOf entry not yet created as an entity. creating entity...\n");
                    }

                    $type = $this->getBibObjectType($entry->type);
                    $reprintedTid = $this->es->createEntity($type, $entry->title, '', $creatorTid);
                    $alreadyCreatedEntryIdsToTids[$entry->id] = $reprintedTid;

                    $this->makeBibObjectStatement($reprintTid, Entity::rReprintOf, $reprintedTid, $creatorTid);
                    if ($verbose) {
                        print("\t\trReprintOf --> $reprintedTid,\n");
                    }

                    $reprintType = $isReprintOfEntry[$bibEntry->id]['reprintType'] ?? null;
                    if ($reprintType !== null) {
                        $this->makeBibObjectStatement($reprintTid, Entity::pDareReprintType, $reprintType, $creatorTid);
                        if ($verbose) {
                            print("\t\tpDareReprintType--> $reprintType,\n");
                        }
                    }
                }
            }
        }
    }


    private function setAuthorsEditorsTranslators(int $tid, object $bibEntry, bool $verbose, int $creatorTid): void {

        // set authors, translators and editors (person or institution)
        foreach ($this->bibTables->entryToPerson as $entryToPersonEntry) {

            if ((int) $entryToPersonEntry->entryId === (int) $bibEntry->id) {

                if (trim($entryToPersonEntry->agentType) === 'person') {

                    $role = $entryToPersonEntry->role ?? null;
                    $name = $entryToPersonEntry->freeName ?? null;
                    $lastName = $entryToPersonEntry->freeLastName ?? "";
                    $firstName = $entryToPersonEntry->freeFirstName ?? "";
                    $sortName = $lastName . ", " . $firstName;
                    $personDareId = $entryToPersonEntry->personId;

                    // $personExists = false;

                    if (!$role === null) {

                        $agentTid = $this->personDareIdsToTids[$personDareId];
                        // $personExists = true;
                        if ($verbose) {
                            print("\t\tperson already exists: $agentTid ($name / $sortName),\n");
                        }
                    }

//                    if (!$personExists) {
//
//                        $personTid = $this->es->createEntity(Entity::tPerson, $name, '', $creatorTid);
//                        $this->makeBibObjectStatement($personTid, Entity::pSortName, $sortName, $creatorTid);
//                        if ($verbose) {
//                            print("\t\tcreated person $personTid ($name / $sortName),\n");
//                        }
//
//                        $this->personTidsToNames[$personTid] = $name;
//
//                    }


                } else if (trim($entryToPersonEntry->agentType) === 'institution') {

                    $institutionsInEs = $this->es->getAllEntitiesForType(Entity::tInstitution);
                    foreach ($institutionsInEs as $institution) {
                        $entityData = $this->es->getEntityData($tid);
                        $name = $entityData->name;
                        $entityStatements = $entityData->statements;
                        foreach ($entityStatements as $entityStatement) {
                            if ($entityStatement->predicate === Entity::pDareRepositoryId and $entityStatement->object === $entryToPersonEntry->institutionId) {
                                $agentTid = $institution;
                            }
                        }
                    }
                }

                if (isset($agentTid)) {

                    switch ($role) {
                        case 1: // author
                            $this->makeBibObjectStatement($tid, Entity::rAuthoredBy, $agentTid, $creatorTid);
                            if ($verbose) {
                                print("\t\trAuthoredBy --> $agentTid ($name),\n");
                            }
                            break;
                        case 2: // editor
                            $this->makeBibObjectStatement($tid, Entity::rEditedBy, $agentTid, $creatorTid);
                            if ($verbose) {
                                print("\t\trEditedBy --> $agentTid ($name),\n");
                            }
                            break;
                        case 3: // translator
                            $this->makeBibObjectStatement($tid, Entity::rTranslatedBy, $agentTid, $creatorTid);
                            if ($verbose) {
                                print("\t\trTranslatedBy --> $agentTid ($name),\n");
                            }
                            break;
                    }
                }
            }
        }

    }

    private function setReviewData (int $tid, object $bibEntry, bool $verbose, int $creatorTid) {

        // set entry review data
        foreach ($this->bibTables->review as $reviewEntry) {
            if ($reviewEntry->reviewOf === $bibEntry->id) {
                $personIdentified = false;

                $reviewerDareId = $reviewEntry->reviewBy;
                $reviewValidFrom = $reviewEntry->validFrom;
                $reviewValidUntil = $reviewEntry->validUntil;
                $reviewerTid = $this->personDareIdsToTids[$reviewerDareId] ?? "unknown";

                if ($reviewerTid !== "unknown") {
                    $personIdentified = true;
                    $this->makeBibObjectStatement($tid, Entity::rDareReviewedBy, $reviewerTid, $creatorTid, [[Entity::pDareReviewValidFrom, $reviewValidFrom], [Entity::pDareReviewValidUntil, $reviewValidUntil]]);
                } else { // no person with corresponding dare id found in the es

                    foreach ($this->bibTables->persons as $personEntry) {
                        if ($reviewerDareId === $personEntry->id) {
                            $personIdentified = true;
                            $reviewerTid = $this->es->createEntity(Entity::tPerson, $personEntry->fullName, '', $creatorTid);
                            $this->makeBibObjectStatement($reviewerTid, Entity::pDarePersonId, $reviewerDareId, $creatorTid);

                            // add created person to data array
                            $this->personDareIdsToTids[$reviewerDareId] = $reviewerTid;

                            if ($verbose) {
                                print("\t\tcreated person $personEntry->fullName,\n");
                            }

                            $this->makeBibObjectStatement($tid, Entity::rDareReviewedBy, $reviewerTid, $creatorTid, [[Entity::pDareReviewValidFrom, $reviewValidFrom], [Entity::pDareReviewValidUntil, $reviewValidUntil]]);

                        }
                    }
                }

                if ($verbose and $personIdentified) {
                    print("\t\trDareReviewedBy --> $reviewerTid [$reviewValidFrom, $reviewValidUntil],\n");
                }

            }
        }

    }


    private function setRepresentationData (int $tid, object $bibEntry, array $representationEntryIdsToTids, bool $verbose, int $creatorTid): void {

        // set representation data
        foreach ($this->bibTables->entryWork as $workEntry) {

            if ($workEntry->bibEntry === $bibEntry->id and (isset($workEntry->representation) and $workEntry->representation !== "")) {

                $representationTid = $representationEntryIdsToTids[$workEntry->representation];
                $this->makeBibObjectStatement($representationTid, Entity::pDareRepresentationSet, $workEntry->representationIsSet, $creatorTid);
                $this->makeBibObjectStatement($representationTid, Entity::pRepresentationType, $workEntry->realizationType, $creatorTid);
                $this->makeBibObjectStatement($tid, Entity::rWitnessOf, $representationTid, $creatorTid);

                if ($verbose) {
                    print("\t\tpDareRepresentationIsSet --> $workEntry->representationIsSet,
                                   pRepresentationType --> $workEntry->realizationType,
                                   rWitnessOf --> $representationTid
                        ");

                }
            }
        }

    }

    private function getBibObjectType(int $type): int {

        // get bib object type, e. g. book or article
        switch ($type) {
            case 1:
            case 4:
                $type = Entity::tBook;
                break;
            case 2:
                $type = Entity::tBookSection;
                break;
            case 3:
                $type = Entity::tArticle;
                break;
            case 5:
                $type = Entity::tBookSeries;
            case 6:
                $type = Entity::tOnlineCatalog;
                break;
            case 7:
                $type = Entity::tOldCatalog;
                break;
        }

        return $type;
    }

    private function createCountry(string $name, int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tCountry, $name, '', $creatorTid, true);
    }

    private function createCity(string $name, string $countryName='', int $creatorTid = -1): array
    {
        return $this->createEntityOfType(Entity::tCity, $name, '---'.$countryName.'---', $creatorTid, true);
    }

    private function createInstitution(string $name, string $cityName='', string $countryName='', int $creatorTid = -1, bool $checkExisting=true): array
    {
        return $this->createEntityOfType(Entity::tInstitution, $name, '---'.$cityName.'---'.$countryName.'---', $checkExisting, $creatorTid, true);
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
    private function createEntityOfType(int $type, string $name, string $locatedIn='', bool $checkExisting=true, int $creatorTid = -1, bool $addSortName = false): array
    {
        // set system as creator
        if ($creatorTid === -1) $creatorTid = Entity::System;

        // get all existing entities of the given type and for existing cities and institutions also their locations
        $entityNamesToTids = [];

        if ($this->existingEntities[$type] === [] and $checkExisting) { // if existingEntities have already been captured, do not do it again

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

    private function getEntityForDareMaterialCode ($code) {

            switch ($code) {
                case '1':
                    return Entity::MaterialPaper;

                case '2':
                    return Entity::MaterialParchment;

                case '3':
                    return Entity::MaterialMixed;

                case '4':
                    return Entity::MaterialVellum;

                case '5':
                    return Entity::MaterialTissue;

                default:
                    return 'unknown';
            }

    }

    private function getEntityForDareLanguageCode ($code) {
        switch ($code) {
            case '1':
                return ['tid' => Entity::LangLatin, 'name' => 'latin'];
            case '2':
                return ['tid' => Entity::LangHebrew, 'name' => 'hebrew'];
            case '3':
                return ['tid' => Entity::LangArabic, 'name' => 'arabic'];
        }
    }

    private function getLocationCodesForInstitutionEntities(): array {

        $locationCodesToInstitutionTids = [];

        $institutionTids = $this->getSystemManager()->getEntitySystem()->getAllEntitiesForType(Entity::tInstitution);

        foreach ($institutionTids as $tid) {
            $instData = $this->es->getEntityData($tid);
            foreach ($instData->statements as $statement) {
                if ($statement->predicate === Entity::pDareLongInstCode) {
                    $locationCode = $statement->object;
                    $locationCodesToInstitutionTids[$locationCode] = $tid;
                }
            };
        }

        return $locationCodesToInstitutionTids;
    }

    private function getLocationCodeForInstitutionEntityViaLocatedInRelations (object $entityData): array {

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
                    print("\tassociated: $entityId (name: $bilderbergId) -> signature -> $signature\n");
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

        print("\nFINISHED!\n
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
            $locationCodes[] = $this->getLocationCodeForInstitutionEntityViaLocatedInRelations($entityData);
        }


        foreach ($docsFromApm as $entityId) {

            $storedAtRelationAlreadySet = false;

            // check if storedAt-relation is already set
            $docEntityData = $this->es->getEntityData($entityId);

            foreach ($docEntityData->statements as $statement) {
                if ($statement->predicate === Entity::pStoredAt) {
                    $storedAtRelationAlreadySet = true;
                }
            }

            $docInfo = $this->getSystemManager()->getDocumentManager()->getLegacyDocInfo((int)$entityId);
            $bilderbergId = $docInfo['title'];
            $bilderbergIdSplitted = explode('-', $bilderbergId);


            if (!$storedAtRelationAlreadySet and ($bilderbergIdSplitted[0] === 'I' or $bilderbergIdSplitted[0] === 'M')) {

                    $countryCode = $bilderbergIdSplitted[1];
                    $cityCode = $bilderbergIdSplitted[2];
                    $instCode = $bilderbergIdSplitted[3];

                    $institutionFound = false;

                    foreach ($institutionEntities as $i => $institutionTid) {

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

                $numProcessedDocs++;

            } else {
                    $numSkippedDocs++;

                    if ($verbose) {
                        print("\tNO institution entity found for $bilderbergId because of wrong title format or storedAt-relation already set for doc entity.\n");

                    }
                }

            if (!$verbose) {
                printf("   %d docs processed\r", $numProcessedDocs);
            }

        }

        print("\nFINISHED!\n
                \t$numAddedStoredAtRelations storedAt-relations added.\n
                \t$numSkippedDocs skipped because of already existing storedAt-relation, wrong doc title format or not having found a fitting institution entity.\n");

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
     * returns the data contained in the dare documents csv-table
     * @return array
     */
    private function getDataFromDareDocLanguageTable() : array
    {
        $data = "/var/apm/share/docs_dare_languages.csv";
        return $this->readCsvWithSingleHeaderToObjectArray($data);
    }

    /**
     * returns the associations of city and institution codes with institution names from the dare data
     * @return array
     */
    public function getInstitutionsDataFromDare(): array
    {

        // get data from csv-files
        $docsFromDareFile = "/var/apm/share/documents_dare.csv";
        $reposFromDareFile = "/var/apm/share/repositories_dare.csv";

        $documents = $this->readCsvWithSingleHeaderToObjectArray($docsFromDareFile);
        $repositories = $this->readCsvWithSingleHeaderToObjectArray($reposFromDareFile);

        // make arrays to be filled
        $institutionData = [];
        $institutionCodesAndIds = [];

        // get all data from the repositories table
        foreach ($repositories as $entry) {
            $institutionData[] = [
                'id' => $entry->id,
                'name' => $entry->repositoryName,
                'url' => $entry->repositoryUrl,
                'dnb' => $entry->dnbUrl,
                'viaf' => $entry->viafUrl,
                'cityCode' => '',
                'countryCode' => '',
                'instCode' => ''
            ];
        }

        // get institution codes and ids for every document
        foreach ($documents as $doc) {

            // get relevant data for doc
            $bilderbergId = explode('-', $doc->bilderbergId);
            $contentTitle = explode('-', $doc->contentTitle);
            $institutionId = $doc->repositoryId;

            // get city and institution code
            if ($institutionId !== "") {

                if (count($bilderbergId) < 2) {
                    $bilderbergId = $contentTitle;
                }

                $countryCode = $bilderbergId[3];
                $cityCode = $bilderbergId[4];
                $institutionCode = $bilderbergId[5];

                $institutionCodesAndIds[] = ['institutionCode' => $institutionCode, 'countryCode' => $countryCode, 'cityCode' => $cityCode, 'id' => $institutionId];
            }
        }

        // add the codes to the institution data
        foreach ($institutionData as $i=>$inst) {

            foreach ($institutionCodesAndIds as $instWithCode) {
                if ($inst['id'] === $instWithCode['id']) {
                    $institutionData[$i]['instCode'] = $instWithCode['institutionCode'] ?? '';
                    $institutionData[$i]['cityCode'] = $instWithCode['cityCode'] ?? '';
                    $institutionData[$i]['countryCode'] = $instWithCode['countryCode'] ?? '';
                    break;
                }
            }

        }

        // sort array alphabetically
        sort($institutionData);

        return $institutionData;
    }

    private function collectDataFromDareBibTables() : void {

        $this->bibTables = new stdClass();

        $this->bibTables->entry = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_entry.csv");
        $this->bibTables->article = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_article.csv");
        $this->bibTables->book = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_book.csv");
        $this->bibTables->bookSection = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_booksection.csv");
        $this->bibTables->category = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_category.csv");
        $this->bibTables->entryCategory = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_entry_category.csv");
        $this->bibTables->entryToPerson = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_entry_person.csv");
        $this->bibTables->entryWork = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_entry_work.csv");
        $this->bibTables->languages = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_languages.csv");
        $this->bibTables->reprint = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_reprint.csv");
        $this->bibTables->review = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_review.csv");
        $this->bibTables->role = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_role.csv");
        $this->bibTables->type = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/bib_type.csv");
        $this->bibTables->work = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/_work_.csv");
        $this->bibTables->persons = $this->readCsvWithSingleHeaderToObjectArray("/var/apm/share/person_normalised.csv");


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
