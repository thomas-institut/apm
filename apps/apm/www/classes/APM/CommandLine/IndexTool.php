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

use APM\CollationTable\CollationTableManager;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Schema\Entity;
use APM\System\Search\IndexType;
use APM\System\Search\SearchIndexManager;
use APM\System\Transcription\TranscriptionManager;
use InvalidArgumentException;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Throwable;

/**
 * Description of IndexManager
 *
 * Commandline utility to manage the open search indices for transcriptions and editions.
 *
 * @author Lukas Reichert
 */
class IndexTool extends CommandLineUtility
{
    private IndexType $indexType;

    private ?TranscriptionManager $transcriptionManager = null;

    private ?ApmEntitySystemInterface $entitySystem = null;

    private ?SearchIndexManager $searchManager = null;


    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getSearchManager(): SearchIndexManager
    {
        if ($this->searchManager === null) {
            $this->searchManager = $this->container->get(SearchIndexManager::class);
        }
        return $this->searchManager;
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getTranscriptionManager(): TranscriptionManager
    {
        if ($this->transcriptionManager === null) {
            $this->transcriptionManager = $this->container->get(TranscriptionManager::class);
        }
        return $this->transcriptionManager;
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getEntitySystem(): ApmEntitySystemInterface
    {
        if ($this->entitySystem === null) {
            $this->entitySystem = $this->container->get(ApmEntitySystemInterface::class);
        }
        return $this->entitySystem;
    }

    private function getIndexTypeFromString(string $indexTypeString): IndexType
    {
        $indexTypeString = strtolower($indexTypeString);
        return match ($indexTypeString) {
            'transcriptions', 'tx' => IndexType::Transcriptions,
            'editions', 'ed' => IndexType::Editions,
            default => throw new InvalidArgumentException("Invalid index type string: $indexTypeString"),
        };
    }


    /**
     * This main function is called from the command line. Depending on the arguments given to the index manager command line tool,
     * a specific operation on a specific index will be executed.
     * @param int $argc
     * @param array $argv
     * @return bool
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     * @throws Throwable
     */
    public function main(int $argc, array $argv): bool
    {

        if (count($argv) < 2) {
            $this->printHelp();
            return true;
        }
        // print help
        if ($argv[1] === '-h') {
            $this->printHelp();
            return true;
        }

        try {
            $this->indexType = $this->getIndexTypeFromString($argv[1]);
        } catch (InvalidArgumentException) {
            print ("Command not found. Please check the help via -h.\n");
            return false;
        }

        $operation = $argv[2];



        switch ($operation) {
//            case 'csvFromDocTitles':
//                $this->createCsvTablesFromDocTitles();
//                break;
//
//            case 'csvFromDare':
//                $this->createCsvTableWithInstitutionCodesAndNames();
//                break;
//
//            case 'cityNames':
//                $city = $this->getCityNamesByUNLocode($argv[3]);
//                print_r($city);
//                break;
//
//            case 'countryNames':
//                $country = $this->getCountryNamesByAlpha2($argv[3]);
//                print_r($country);
//                break;

            case 'build':
                $this->buildIndex($this->indexType);
                break;

            case 'update':
                $limit = isset($argv[3]) ? intval($argv[3]) : -1;
                $this->updateIndex($this->indexType, $limit);
                break;


            case 'update-item':
                if ($this->indexType === IndexType::Editions) {
                    if (!isset($argv[3])) {
                        print 'Table ID is required for editions update-item command';
                        return false;
                    }
                    $tableId = intval($argv[3]);
                    $this->getSearchManager()->updateEditionInIndex($tableId, true);
                } else {
                    if (!isset($argv[3])) {
                        print 'doc:page:col or pageId:col required for editions update-item command';
                        return false;
                    }
                }
                break;

            case 'show-item':
            case 'remove-item':
                print "Not implemented yet\n";
                break;

            default:
                print("Command not found. You will find some help via 'indexmanager -h'\n.");
        }

        return true;
    }


    /**
     * Prints information about how to use the index manager command line tool. Use option -h in the command line to get the information.
     * @return void
     */
    private function printHelp(): void
    {
        $help = <<<END
Usage: indexmanager [transcriptions/editions] [operation] <...operation arguments...>

Available operations are:
  build - completely re-builds the search indices
  update [<limit>] - updates the index, use limit to limit the number of updates, if not present or -1 all updates are done
  update-item <tableId>|<docId:page:col> - updates a single item in the index
  remove-item <tableId>|<docId:page:col> - removes a single item from the index
  show-item <tableId>|<docId:page:col> - shows a single item from the index
  
END;

        print($help);
    }


    /**
     * Builds the transcriptions or editions index in typesense after getting all relevant data from the sql database.
     * Deletes already existing transcriptions or editions index.
     *
     * @param IndexType $indexType
     * @return void
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function buildIndex(IndexType $indexType): void
    {

        $doIt = $this->userRespondsYes("Are you sure you want to rebuild the $indexType->name index? This will delete all existing data and will probably take a very long time. Type 'yes' to continue: ");
        if (!$doIt) {
            return;
        }

        print("Building index $indexType->name\n");
        $absStart = microtime(true);
        $searchManager = $this->getSearchManager();
        $searchManager->resetIndex($indexType);

        if ($indexType === IndexType::Transcriptions) {
            // get a list of all docIDs in the sql-database
            $docIds = $this->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);

            $transcribedPageCount = $this->getTranscriptionManager()->getTranscribedPageCount();

            printf("There are %d documents in the system with %d transcribed pages in total\n", count($docIds), $transcribedPageCount);
        } else {
            /** @var CollationTableManager $ctm */
            $ctm = $this->container->get(CollationTableManager::class);
            $tablesInfo = $ctm->getTablesInfo();

            $editionIds = [];

            foreach ($tablesInfo as $tableInfo) {
                if ($tableInfo->type === 'edition') {
                    $editionIds[] = $tableInfo['id'];
                }
            }

            $this->logger->debug(sprintf("There are %d active tables in the system of which %d are editions",
                count($tablesInfo), count($editionIds)));
        }

        $result = $searchManager->updateIndex($this->indexType);

        $elapsedTime = time() - $absStart;

        printf("Done in %.2f minutes, %.2f secs/update\n",
            $elapsedTime / 60, $result->updatesPerformed !== 0 ? $elapsedTime/$result->updatesPerformed : 0);

    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function updateIndex(IndexType $indexType, int $limit): void {
        $absStart = microtime(true);
        $searchManager = $this->getSearchManager();


        if ($limit === 0) {
            print "Just checking for needed updates...\n";
        }
        $result = $searchManager->updateIndex($indexType, $limit);
        $elapsedTime = time() - $absStart;

        if ($limit === 0) {
            printf("%d updates are needed, no updates performed, %d deletions.\n", $result->updatesNeeded, $result->deletionsPerformed);
            printf("Done in %.2f minutes\n",$elapsedTime / 60);
            return;
        }

        printf("%d updates of %d done in %.2f minutes, %.2f secs/update\n", $result->updatesPerformed, $result->updatesNeeded,
            $elapsedTime / 60, $result->updatesPerformed !== 0 ? $elapsedTime/$result->updatesPerformed : 0);
    }


}
