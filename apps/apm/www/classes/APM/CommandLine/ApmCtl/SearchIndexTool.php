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

namespace APM\CommandLine\ApmCtl;

use APM\CollationTable\CollationTableManager;
use APM\CommandLine\CliToolBox;
use APM\CommandLine\MultiToolCli\MultiToolCliUtility;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Schema\Entity;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Search\IndexType;
use APM\System\Search\SearchIndexManager;
use APM\System\Transcription\TranscriptionManager;
use InvalidArgumentException;
use Psr\Log\LoggerInterface;


class SearchIndexTool implements MultiToolCliUtility
{

    const string CmdBuild = 'build';
    const string CmdUpdate = 'update';
    const string CmdRemoveItem = 'remove-item';
    const string CmdShowItem = 'show-item';
    const string CmdUpdateItem = 'update-item';

    private IndexType $indexType;

    public function __construct(
        private readonly LoggerInterface          $logger,
        private readonly SearchIndexManager       $searchManager,
        private readonly TranscriptionManager     $transcriptionManager,
        private readonly ApmEntitySystemInterface $entitySystem,
        private readonly DocumentManager          $documentManager,
        private readonly CollationTableManager    $collationTableManager
    )
    {
    }

    private function getSearchManager(): SearchIndexManager
    {
        return $this->searchManager;
    }

    private function getTranscriptionManager(): TranscriptionManager
    {
        return $this->transcriptionManager;
    }

    private function getEntitySystem(): ApmEntitySystemInterface
    {
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
     * Prints information about how to use the index manager command line tool. Use option -h in the command line to get the information.
     * @return void
     */
    private function printHelp(): void
    {
        print self::getUsage() . "\n";
    }


    /**
     * Builds the transcriptions or editions index in typesense after getting all relevant data from the sql database.
     * Deletes already existing transcriptions or editions index.
     *
     * @param IndexType $indexType
     * @return void
     */
    private function buildIndex(IndexType $indexType): void
    {
        $doIt = CliToolBox::userRespondsYes("Are you sure you want to rebuild the $indexType->name index? This will delete all existing data and will probably take a very long time. Type 'yes' to continue: ");
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
            $ctm = $this->collationTableManager;
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
            $elapsedTime / 60, $result->updatesPerformed !== 0 ? $elapsedTime / $result->updatesPerformed : 0);

    }

    private function updateIndex(IndexType $indexType, int $limit): void
    {
        $absStart = microtime(true);
        $searchManager = $this->getSearchManager();


        if ($limit === 0) {
            print "Just checking for needed updates...\n";
        }
        $result = $searchManager->updateIndex($indexType, $limit);
        $elapsedTime = time() - $absStart;

        if ($limit === 0) {
            printf("%d updates are needed, no updates performed, %d deletions.\n", $result->updatesNeeded, $result->deletionsPerformed);
            printf("Done in %.2f minutes\n", $elapsedTime / 60);
            return;
        }
        if ($result->updatesNeeded === 0) {
            return;
        }

        printf("%d updates of %d done in %.2f minutes, %.2f secs/update\n", $result->updatesPerformed, $result->updatesNeeded,
            $elapsedTime / 60, $result->updatesPerformed !== 0 ? $elapsedTime / $result->updatesPerformed : 0);
    }


    public static function getName(): string
    {
        return 'index';
    }

    public static function getUsage(): string
    {
        return <<<END
Search index tool usage:
  build tx|ed: completely re-builds the search indices
  update tx|ed [<limit>]: updates the index, use <limit> to limit the number of updates, if not present or -1 all updates are done
  update-item ed <tableId> | tx <docId:page:col> | tx <pageId:col>: updates a single item in the index
  remove-item ed <tableId>| tx <docId:page:col> | tx <pageId:col>: removes a single item from the index
  show-item ed <tableId> | tx <docId:page:col> | tx <pageId:col>: shows a single item from the index

  tx = transcriptions
  ed = editions
END;
    }

    public static function getDescription(): string
    {
        return 'Search index related commands';
    }

    public function run(int $argc, array $argv): int
    {
        if (count($argv) < 3) {
            $this->printHelp();
            return 0;
        }

        $command = $argv[1];

        try {
            $this->indexType = $this->getIndexTypeFromString($argv[2]);
        } catch (InvalidArgumentException) {
            print ("Command not found. Please check the help via -h.\n");
            return 1;
        }

        switch ($command) {
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

            case self::CmdBuild:
                $this->buildIndex($this->indexType);
                break;

            case self::CmdUpdate:
                $limit = isset($argv[3]) ? intval($argv[3]) : -1;
                $this->updateIndex($this->indexType, $limit);
                break;

            case self::CmdUpdateItem:
                if ($this->indexType === IndexType::Transcriptions) {
                    [$docId, $pageNumber, $column] = $this->getDocPageColumnFromArg($argv[3]);
                    if ($docId === null) {
                        CliToolBox::printStdErr("Invalid doc, page, column for update");
                        return 1;
                    }
                    $this->searchManager->updateTranscriptionInIndex($docId, $pageNumber, $column);
                } else {
                    $this->logger->warning("Update item not implemented for index type {$this->indexType->name}");
                }
                break;

            case self::CmdShowItem:
            case self::CmdRemoveItem:
                print "Not implemented yet\n";
                break;

            default:
                print("Command not found. \n");
                print self::getUsage() . "\n";
        }

        return 0;
    }

    /**
     * Returns the docId, pageId and column from the argument: docId:page:col or pageId:col
     *
     * If the parameter is not in the correct format, returns [null, null, null].
     *
     * @param string $arg
     * @return array<int|null>
     */
    private function getDocPageColumnFromArg(string $arg): array
    {
        $fields = explode(':', $arg);
        if (count($fields) === 2) {
            $pageId = intval($fields[0]);
            $column = intval($fields[1]);
            if ($column < 0) {
                return [null, null, null];
            }
            try {
                $pageInfo = $this->documentManager->getPageInfo($pageId);
            } catch (PageNotFoundException) {
                return [null, null, null];
            }
            return [$pageInfo->docId, $pageInfo->pageNumber, $column];
        }
        $docId = intval($fields[0]);
        $pageNumber = intval($fields[1]);
        $column = intval($fields[2]);
        if ($docId < 0 || $pageNumber < 0 || $column < 0) {
            return [null, null, null];
        }
        return [$docId, $pageNumber, $column];
    }
}
