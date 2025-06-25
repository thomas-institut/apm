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

use APM\EntitySystem\Schema\Entity;
use APM\System\Document\Exception\DocumentNotFoundException;
use stdClass;
use GuzzleHttp\Client as HttpClient;

/**
 * Description of LocationDataGrabber
 *
 * Commandline utility to grab country, city and institution data for all transcriptions in the apm and dare; writes the data into csv-files.
 * Use option '-h' in the command line for getting information about how to use the location data grabber.
 *
 * @author Lukas Reichert
 */
class LocationDataGrabber extends CommandLineUtility
{
    /**
     * This main function is called from the command line. Depending on the arguments given to the location grabber command line tool,
     * a specific operation will be executed.
     * @param $argc
     * @param $argv
     * @return bool
     */
    public function main($argc, $argv): bool
    {
        // print help
        if (count($argv) < 1 || $argv[1] === '-h') {
            $this->printHelp();
            return true;
        }

        // get operation
        $operation = $argv[1];

        switch ($operation) {
            case 'grabAndWriteAll':
                $this->grabAllData();
                break;

            case 'getInstitutionsFromDare':
                $institutionData = $this->getInstitutionsDataFromDare();
                print_r($institutionData);
                break;

            case 'getCityFromWikidata':
                $city = $this->getCityNamesByUnlocodeFromWikidata($argv[2]);
                print_r($city);
                break;

            case 'getCountryFromWikidata':
                $country = $this->getCountryNamesByIsoAlpha2FromWikidata($argv[2]);
                print_r($country);
                break;
                
            case 'getCitiesAndCountriesFromDare':
                $citiesAndCountries = $this->getCityAndCountryNamesFromDare();
                print_r($citiesAndCountries);
                break;

            case 'getDocumentsDataFromDare':
                $data = $this->getDataFromDareDocumentsTable();
                print_r($data);
                break;

            default:
                print("Command not found. You will find some help via 'locationgrabber -h'\n.");
        }

        return true;
    }

    /**
     * Prints information about how to use the location grabber command line tool. Use option -h in the command line to get the information.
     * @return void
     */
    private function printHelp(): void
    {
        $help = <<<END
Usage: locationdatagrabber [operation] ([arg])

Available operations are:
  grabAndWriteAll - collects all location data and writes them into multiple csv-files, retrieved from dare and wikidata
  getInstitutionsFromDare - returns the codes, cityCodes, cities and names of all institutions, retrieved only from dare
  getCityFromWikidata [arg] - returns the city name of a given UNLOCODE in english, german and italian, retrieved only from wikidata
  getCountryFromWikidata [arg] - returns the country name of a given ISO3166-1-alpha-2-code in english, german and italian, retrieved only from wikidata

END;

        print($help);
    }

    /**
     * reads the documents and repository csv-tables from dare to retrieve all associations of country-/city-codes and country-/city-names
     * @return array
     */
    private function getCityAndCountryNamesFromDare() :array
    {

        // array to be returned
        $results = [];

        // get docs and repo data from dare
        $docsFromDareFile = "documents_dare.csv";
        $reposFromDareFile = "repositories_dare.csv";

        $documents = $this->readCsvToObjectArray($docsFromDareFile);
        $repositories = $this->readCsvToObjectArray($reposFromDareFile);

        // retrieve country and city names from the dare repos-data for all docs from the dare docs-data
        foreach ($documents as $doc) {

            $bilderbergId = explode('-', $doc->bilderbergId);

            if (count($bilderbergId) > 4) { // excludes docs which definitely do not have a bilderberg id

                $entry = [
                    'countryCode' => $bilderbergId[3],
                    'cityCode' => $bilderbergId[4],
                    'countryName' => '',
                    'cityName' => ''
                ];

                // get city and country names
                foreach ($repositories as $repository) {

                    if ($doc->repositoryId === $repository->id) {

                        // remove information about regions or so added in parantheses from city names
                        $cityName = $repository->settlement;
                        $cityName = explode('(', $cityName)[0];

                        $entry['cityName'] = trim($cityName);
                        $entry['countryName'] = $repository->country;
                        break;
                    }

                }

                $results[] = $entry;
            }
        }

        // remove duplicates from the results and sort them alphabetically
        $results = array_map('serialize', $results);
        $results = array_unique($results);
        $results = array_map('unserialize', $results);

        sort($results);

        return $results;
}

    /**
     * returns the names of a country in english, german and italian for a given ISO3166-1-alpha-2-code
     * @param string $isoCode
     * @return array|string[]
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
private function getCountryNamesByIsoAlpha2FromWikidata(string $isoCode): array 
{
    // process iso-code
    $isoCode = strtoupper(trim($isoCode));
    if (!preg_match('/^[A-Z]{2}$/', $isoCode)) {
        return [];
    }

    // write wikidata query
    $query = <<<SPARQL
        SELECT ?country ?de ?en ?it WHERE {
        ?country wdt:P297 "$isoCode".
        OPTIONAL { ?country rdfs:label ?de FILTER (lang(?de) = "de") }
        OPTIONAL { ?country rdfs:label ?en FILTER (lang(?en) = "en") }
        OPTIONAL { ?country rdfs:label ?it FILTER (lang(?it) = "it") }
        }
        LIMIT 1
        SPARQL;

    // query wikidata
    $client = new HttpClient();
    
    try {
        $response = $client->get('https://query.wikidata.org/sparql', [
            'headers' => [
                'Accept' => 'application/sparql-results+json',
                'User-Agent' => 'CountryNameFetcherBot/1.0 (your@email.example)'
            ],
            'query' => [
                'format' => 'json',
                'query' => $query,
            ],
            'timeout' => 15,
        ]);
           
        // get and return query results
        $results = json_decode($response->getBody(), true)['results']['bindings'] ?? [];
        if (empty($results)) return [];
        $row = $results[0];
        
        return [
            'de' => $row['de']['value'] ?? '',
            'en' => $row['en']['value'] ?? '',
            'it' => $row['it']['value'] ?? '',
        ];
        } catch (\Exception $e) {
        print('Error: ' . $e->getMessage());
    }
    
        return [];
    }

    /**
     * returns the name of city in english, german and italian for a given UNLOCODE
     * @param string $unlocode
     * @return array|string[]
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    private function getCityNamesByUnlocodeFromWikidata(string $unlocode): array 
    {
        // process unlocode
        $unlocode = strtoupper(trim($unlocode));
        if (!preg_match('/^[A-Z0-9]{5}$/', $unlocode)) {
            return [];
        }

        // write wikidata query
        $query = <<<SPARQL
            SELECT DISTINCT ?item ?label_de ?label_en ?label_it WHERE {
                {
                    SELECT DISTINCT ?item WHERE {
                        ?item p:P1937 ?statement0.
                        ?statement0 (ps:P1937) "$unlocode".
                        ?item p:P31 ?statement1.
                        ?statement1 (ps:P31/(wdt:P279*)) wd:Q515.
                    }
                LIMIT 100
                }
                OPTIONAL { ?item rdfs:label ?label_de FILTER (lang(?label_de) = "de") }
                OPTIONAL { ?item rdfs:label ?label_en FILTER (lang(?label_en) = "en") }
                OPTIONAL { ?item rdfs:label ?label_it FILTER (lang(?label_it) = "it") }
            }
            SPARQL;

        // make wikidata query
        $client = new HttpClient();
        try {
            $response = $client->get('https://query.wikidata.org/sparql', [
                'headers' => [
                    'Accept' => 'application/sparql-results+json',
                    'User-Agent' => 'LocodeP1937Bot/1.0 (your@email.example)'
                ],
                'query' => [
                    'format' => 'json',
                    'query' => $query,
                ],
                'timeout' => 15,
            ]);

        // get query results
        $results = json_decode($response->getBody(), true)['results']['bindings'] ?? [];

        if (empty($results)) return [];

        $row = $results[0];
        $valueEn = $row['label_en']['value'] ?? '';
        $valueDe = $row['label_de']['value'] ?? '';
        $valueIt = $row['label_it']['value'] ?? '';

        return [
            'en' => $valueEn,
            'de' => $valueDe,
            'it' => $valueIt,
        ];
        } catch (\Exception $e) {
            print('Error: ' . $e->getMessage());
        }

        return [];
    }

    /**
     * returns all bilderberg ids contained in the dare documents csv-table 
     * @return array
     */
    public function getAllBilderbergIdsFromDare() : array 
    {

        $ids= [];

        $docsFromDareFile = "documents_dare.csv";
        $documents = $this->readCsvToObjectArray($docsFromDareFile);

        foreach ($documents as $doc) {
            $id = $doc->bilderbergId;
            $id = str_replace("BOOK-DARE-", "", $id);
            $ids[] = $id;
        }
        
        return $ids;
    }

    function toCamelCase($string): string
    {
        $string = strtolower($string);
        $string = preg_replace('/[^a-z0-9]+/', ' ', $string);
        $words = explode(' ', $string);
        $camelCase = array_shift($words);
        foreach ($words as $word) {
            $camelCase .= ucfirst($word);
        }
        return $camelCase;
    }

    /**
     * reads a csv file and returns its contents as an object
     * @param $filename
     * @return array
     */
    public function readCsvToObjectArray($filename): array 
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
     * returns the associations of city and institution codes with institution names from the dare data
     * @return array
     */
    private function getInstitutionsDataFromDare() {

        // get data from csv-files
        $docsFromDareFile = "documents_dare.csv";
        $reposFromDareFile = "repositories_dare.csv";
        
        $documents = $this->readCsvToObjectArray($docsFromDareFile);
        $repositories = $this->readCsvToObjectArray($reposFromDareFile);

        // make arrays to be filled
        $institutionNamesAndIds = [];
        $institutionCodesAndIds = [];
        $institutionCodesAndNames = [];

        // get all institution names and ids
        foreach ($repositories as $entry) {
            $institutionNamesAndIds[] = ['name' => $entry->repositoryName, 'id' => $entry->id];
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

                $cityCode = $bilderbergId[4];
                $institutionCode = $bilderbergId[5];

                $institutionCodesAndIds[] = ['institutionCode' => $institutionCode, 'cityCode' => $cityCode, 'id' => $institutionId];
            }
        }
        
        // get institution codes and their associated names
        foreach ($institutionCodesAndIds as $entry) {
            
            $institutionCode = $entry['institutionCode'];

            // get institution name
            foreach ($institutionNamesAndIds as $institutionNameAndId) {
                if ($institutionNameAndId['id'] === $entry['id']) {
                    $institutionName = $institutionNameAndId['name'];
                    break;
                }
            }

            // collect results
            $result = ['institutionCode' => $institutionCode, 'cityCode' => $entry['cityCode'], 'institutionName' => $institutionName];

            // do not add duplicates to the array to be returned
            if (!in_array($result, $institutionCodesAndNames)) {
                $institutionCodesAndNames[] = $result;
            };
        }

        // sort array alphabetically
        sort($institutionCodesAndNames);

        return $institutionCodesAndNames;
    }

    /**
     * grabs all data from dare and wikidata and writes them into seperate files as well as into a file which contains all data
     * @return void
     * @throws DocumentNotFoundException
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    private function grabAllData(): void 
    {
        // make arrays to be filled
        $bilderbergIdsWithAllCodes = [];
        $countryCodesWithNames = [];
        $cityCodesWithNames = [];
        $institutionAndCityCodesWithInstitutionNames = [];

        print("getting institutions data from exported dare table...\n");
        $institutionDataFromDare = $this->getInstitutionsDataFromDare();

        print("getting bilderberg ids from the apm database...\n");
        $bilderbergIdsFromApm = [];
        $docsFromApm = $this->getSystemManager()->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);
        foreach ($docsFromApm as $docId) {
            $bilderbergId = $this->getBilderbergIdFromApm($docId);
            $bilderbergIdsFromApm[] = $bilderbergId;
        }
        $numBilderbergIdsApm = count($bilderbergIdsFromApm);
        print("found $numBilderbergIdsApm bilderberg ids in the apm database.\n");

        print("getting bilderberg ids from exported dare table...\n");
        $bilderbergIdsFromDare = $this->getAllBilderbergIdsFromDare();
        $numBilderbergIdsDare = count($bilderbergIdsFromDare);
        print("found $numBilderbergIdsDare bilderberg ids in the exported dare table.\n");
        
        // collect and sort bilderberg ids without duplicates
        $allBilderbergIds = array_merge($bilderbergIdsFromApm, $bilderbergIdsFromDare);
        $allBilderbergIds = array_unique($allBilderbergIds);+
        sort($allBilderbergIds);
        $numAllBilderbergIds = count($allBilderbergIds);
        print("found $numAllBilderbergIds unique bilderberg ids in total.\n");

        print("iterating over all bilderberg ids...\n");
        foreach ($allBilderbergIds as $i=>$bilderbergId) {
            
            // check if the bilderberg id has the correct format
            if (str_starts_with($bilderbergId, 'M-') || str_starts_with($bilderbergId, 'I-')) {
                
                // split bilderberg id
                $bilderbergIdSplitted = explode("-", $bilderbergId);

                // extract country-, city- and institution codes from the bilderberg id
                if (@$bilderbergIdSplitted[3] === "Add.27562") { // correct a specific incomplete bilderberg id
                    
                    $countryCode = 'GB';
                    $cityCode = $bilderbergIdSplitted[1] ?? '';
                    $institutionCode = $bilderbergIdSplitted[2] ?? '';
                    
                } else if (count($bilderbergIdSplitted) >= 4) {
                    
                    $countryCode = $bilderbergIdSplitted[1];
                    $cityCode = $bilderbergIdSplitted[2];
                    $institutionCode = $bilderbergIdSplitted[3];
                    
                } else {
                    fwrite(STDERR, "Could not create entry for $bilderbergId.\n");
                    continue;
                }

                // associate bilderberg id with country-, city- and institution-codes
                $bilderbergIdsWithAllCodes[] = [
                    'bilderbergId' => $bilderbergId,
                    'countryCode' => $countryCode,
                    'cityCode' => $cityCode,
                    'institutionCode' => $institutionCode
                ];

                // associate country code with country names in english, german and italian
                $countryName = $this->getCountryNamesByIsoAlpha2FromWikidata($countryCode);
                $countryCodesWithNames[] = [
                    'countryCode' => $countryCode,
                    'en' => $countryName['en'] ?? '',
                    'de' => $countryName['de'] ?? '',
                    'it' => $countryName['it'] ?? ''
                ];

                // associate city code with city names in english, german and italian
                $cityName = $this->getCityNamesByUnlocodeFromWikidata($countryCode.$cityCode);
                $cityCodesWithNames[] = [
                    'cityCode' => $cityCode,
                    'en' => $cityName['en'] ?? '',
                    'de' => $cityName['de'] ?? '',
                    'it' => $cityName['it'] ?? ''
                ];

                // associate institution codes with city codes and institution names
                $match = false;

                foreach ($institutionDataFromDare as $institutionEntry) {
                    if ($institutionEntry['institutionCode'] === $institutionCode && $institutionEntry['cityCode'] === $cityCode) {

                        $match = true;
                        $institutionAndCityCodesWithInstitutionNames[] = [
                            'institutionCode' => $institutionCode,
                            'cityCode' => $cityCode,
                            'institutionName' => $institutionEntry['institutionName'] ?? ''
                        ];
                    }
                }

                if (!$match) {
                    $institutionAndCityCodesWithInstitutionNames[] = [
                        'institutionCode' => $institutionCode,
                        'cityCode' => $cityCode,
                        'institutionName' => ''
                    ];
                }
            }

            // signal progress to the user
            printf("   %d bilderberg ids processed\r", $i);

        }

        print("\nALL DATA GRABBED!\n");
        
        print("clean and sort data and write them into files...\n");
        sort($bilderbergIdsWithAllCodes);
        sort($countryCodesWithNames);
        sort($cityCodesWithNames);
        sort($institutionAndCityCodesWithInstitutionNames);

        // remove duplicates from all data
        $countryCodesWithNames = $this->removeDuplicates($countryCodesWithNames);
        $cityCodesWithNames = $this->removeDuplicates($cityCodesWithNames);
        $institutionAndCityCodesWithInstitutionNames = $this->removeDuplicates($institutionAndCityCodesWithInstitutionNames);
        
        // get country and city codes with names from dare
        $countryAndCityCodesWithNamesFromDare = $this->getCityAndCountryNamesFromDare();

        // collect data for the complete table csv-file
        $completeTableData = $this->collectDataForCompleteTable($bilderbergIdsWithAllCodes, $institutionAndCityCodesWithInstitutionNames, $countryCodesWithNames, $cityCodesWithNames, $countryAndCityCodesWithNamesFromDare);

        // create csv tables
        $this->writeXlsHtmlFile('bilderbergIdsWithAllCodes.xls', ['bilderbergID', 'countryCode', 'cityCode', 'institutionCode'], $bilderbergIdsWithAllCodes);
        $this->writeXlsHtmlFile('countryCodesWithNames.xls', ['countryCode', 'en', 'de', 'it'], $countryCodesWithNames);
        $this->writeXlsHtmlFile('cityCodesWithNames.xls', ['cityCode', 'en', 'de', 'it'], $cityCodesWithNames);
        $this->writeXlsHtmlFile('institutionAndCityCodesWithInstitutionNames.xls', ['institutionCode', 'cityCode', 'institutionName'], $institutionAndCityCodesWithInstitutionNames);
        $this->writeXlsHtmlFile('countryAndCityCodesWithNamesFromDare.xls', ['countryCode', 'cityCode', 'countryName', 'cityName'], $countryAndCityCodesWithNamesFromDare);
        $this->writeXlsHtmlFile('locationDataComplete.xls', ['Formal Problem', 'Bilderberg ID', 'Code (Country-City-Institution)', 'Country (Wikidata)', 'City (Wikidata)', 'Country (DARE)', 'City (DARE)', 'Institution'], $completeTableData);

        echo "FINISHED!\n";
    }

    /**
     * collects all data to be written in the complete table, which contains all location data retrieved from dare and wikidata
     * @param $bilderbergIdsWithAllCodes
     * @param $institutionAndCityCodesWithInstitutionNames
     * @param $countryCodesWithNames
     * @param $cityCodesWithNames
     * @param $countryAndCityCodesWithNamesFromDare
     * @return array
     */
    private function collectDataForCompleteTable($bilderbergIdsWithAllCodes, $institutionAndCityCodesWithInstitutionNames, $countryCodesWithNames, $cityCodesWithNames, $countryAndCityCodesWithNamesFromDare): array 
    {
        
        $completeTableData = [];

        // iterate over bilderberg ids with all codes
        foreach ($bilderbergIdsWithAllCodes as $bilderbergIdWithAllCodes) {

            // entry to be added to the complete table data
            $entry = [
                'formalProblem' => '',
                'docTitle' => $bilderbergIdWithAllCodes['bilderbergId'],
                'code' => $bilderbergIdWithAllCodes['countryCode'] . "-" . $bilderbergIdWithAllCodes['cityCode'] . "-" . $bilderbergIdWithAllCodes['institutionCode'],
                'countryWikidata' => '',
                'cityWikidata' => '',
                'countryDare' => '',
                'cityDare' => '',
                'institutionName' => ''
            ];

            // get country names from wikidata
            foreach ($countryCodesWithNames as $countryEntry) {
                if ($bilderbergIdWithAllCodes['countryCode'] === $countryEntry['countryCode'] && $countryEntry['en'] !== '') {
                    $entry['countryWikidata'] = $countryEntry['en'] . "/" . $countryEntry['de'] . "/" . $countryEntry['it'];
                    break;
                }
            }

            if ($entry['countryWikidata'] === '') {
                $entry['formalProblem'] = '-MISSING COUNTRY (WIKIDATA)-';
            }

            // get city names from wikidata
            foreach ($cityCodesWithNames as $cityEntry) {
                if ($bilderbergIdWithAllCodes['cityCode'] === $cityEntry['cityCode'] && $cityEntry['en'] !== '') {
                    $entry['cityWikidata'] = $cityEntry['en'] . "/" . $cityEntry['de'] . "/" . $cityEntry['it'];
                    break;
                }
            }

            if ($entry['cityWikidata'] === '') {
                $entry['formalProblem'] =  $entry['formalProblem'] . '-MISSING CITY (WIKIDATA)-';
            }


            // get country and city names from dare
            foreach ($countryAndCityCodesWithNamesFromDare as $dareCountryAndCityEntry) {
                if ($dareCountryAndCityEntry['countryCode'] === $bilderbergIdWithAllCodes['countryCode'] && $dareCountryAndCityEntry['cityCode'] === $bilderbergIdWithAllCodes['cityCode']) {
                    $entry['countryDare'] = $dareCountryAndCityEntry['countryName'];
                    $entry['cityDare'] = $dareCountryAndCityEntry['cityName'];
                    break;
                }
            }

            if ($entry['countryDare'] === '') {
                $entry['formalProblem'] =  $entry['formalProblem'] . '-MISSING COUNTRY (DARE)-';
            }

            if ($entry['cityDare'] === '') {
                $entry['formalProblem'] =  $entry['formalProblem'] . '-MISSING CITY (DARE)-';
            }

            // get institution name
            $firstMatch = true;

            foreach ($institutionAndCityCodesWithInstitutionNames as $institutionEntry) {

                if ($bilderbergIdWithAllCodes['institutionCode'] === $institutionEntry['institutionCode'] && $bilderbergIdWithAllCodes['cityCode'] === $institutionEntry['cityCode']) {

                    if ($firstMatch) {
                        $entry['institutionName'] = $institutionEntry['institutionName'];
                        $firstMatch = false;
                    } else {
                        $entry['institutionName'] = $entry['institutionName'] . " ODER " . $institutionEntry['institutionName'];
                        $entry['formalProblem'] = $entry['formalProblem'] . '-AMBIGUITY (INSTITUTION)-';
                    }
                }
            }

            if ($entry['institutionName'] === '') {
                $entry['formalProblem'] =  $entry['formalProblem'] . '-MISSING INSTITUTION-';
            }

            // detect conflicts in country and city values
            if (!str_contains($entry['countryWikidata'], $entry['countryDare']) && !($entry['countryWikidata'] === '' || $entry['countryDare'] === '')) {
                $entry['formalProblem'] =  $entry['formalProblem'] . '-CONFLICT (COUNTRIES)-';
            }

            if (!str_contains($entry['cityWikidata'], $entry['cityDare']) && !($entry['cityWikidata'] === '' || $entry['cityDare'] === '')) {
                $entry['formalProblem'] =  $entry['formalProblem'] . '-CONFLICT (CITIES)-';
            }

            $completeTableData[] = $entry;
        }

        sort($completeTableData);

        // sort data by number of detected formal problems
        usort($completeTableData, function($a, $b) {
            $countProblemsA = 0;
            $countProblemsB = 0;

            if (isset($a['formalProblem']) && $a['formalProblem'] !== '') {
                // Remove leading/trailing dashes, then split by '--'
                $partsA = array_filter(explode('--', trim($a['formalProblem'], '-')), fn($s) => $s !== '');
                $countProblemsA = count($partsA);
            }
            if (isset($b['formalProblem']) && $b['formalProblem'] !== '') {
                $partsB = array_filter(explode('--', trim($b['formalProblem'], '-')), fn($s) => $s !== '');
                $countProblemsB = count($partsB);
            }

            // more problems to the front
            return $countProblemsB <=> $countProblemsA;
        });
        
        return $completeTableData;
    }
    
    /**
     * removes duplicates from an array of arrays
     * @param array $data
     * @return array
     */
    private function removeDuplicates(array $data): array 
    {
        $result = array_map('serialize', $data);
        $result = array_unique($result);
        return array_map('unserialize', $result);
    }
    
    /**
     * writes the given data into a given csv-file
     * @param string $filename
     * @param array $headers
     * @param array $data
     * @return void
     */
    private function writeCsvFile(string $filename, array $headers, array $data): void 
    {
        $f = fopen($filename, 'w');
        fputcsv($f, $headers);
        foreach ($data as $row) {
            fputcsv($f, $row);
        }
        fclose($f);
    }

    private function writeXlsHtmlFile(string $filename, array $headers, array $data): void
    {
        $f = fopen($filename, 'w');
        fwrite($f, "<table border='1'><tr>");
        foreach ($headers as $header) {
            fwrite($f, "<th>" . htmlspecialchars($header) . "</th>");
        }
        fwrite($f, "</tr>");
        foreach ($data as $row) {
            fwrite($f, "<tr>");
            foreach ($row as $cell) {
                fwrite($f, "<td>" . htmlspecialchars($cell) . "</td>");
            }
            fwrite($f, "</tr>");
        }
        fwrite($f, "</table>");
        fclose($f);
    }

    /**
     * returns the bilderberg id of a document in the apm database by its doc-id
     * @param string $doc_id
     * @return string
     * @throws DocumentNotFoundException
     */
    public function getBilderbergIdFromApm(string $doc_id): string
    {
        $doc_info = $this->getSystemManager()->getDocumentManager()->getLegacyDocInfo((int)$doc_id);
        return $doc_info['title'];
    }
}
