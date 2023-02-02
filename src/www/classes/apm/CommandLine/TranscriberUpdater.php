<?php


/*
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

namespace APM\CommandLine;

use APM\System\ApmConfigParameter;
use APM\System\OpenSearchScheduler;
use OpenSearch\ClientBuilder;

/**
 * Description of UpdateIndex
 *
 * Commandline utility to update the OpenSearch-index with all transcripts that are scheduled in the SQL-table ,scheduler'.
 *
 * REQUIREMENTS
 * 1. There has to exist an index in OpenSearch called ,transcripts'. There fore execute ./createindex in the utilities-directory.
 * 2. The SQL table ap_scheduler has to be created before with the right structure. (see OpenSearchScheduler-class)
 * 3. Because ./updateindex will be triggered via cron, add the following line to your root crontab (sudo crontab -e). Replace 'ASTERISK' with '*':

 * * * * * p=$(find /home -path "ASTERISK/apm/src/www/utilities"); cd "${p}"; ./updateindex

 *
 * @author Lukas Reichert
 */

class TranscriberUpdater extends IndexUpdater
{

    public function main($argc, $argv): bool {

        // Instantiate OpenSearch client
        $this->client = (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Name of the index in OpenSearch
        $this->indexName = 'transcripts';

        // Get a list of all docIDs in the sql-database
        $doc_list = $this->dm->getDocIdList('title');

        // Iterate over all docs
        foreach ($doc_list as $doc_id) {

            // Get a list of transcribed pages of the document
            $pages_transcribed = $this->dm->getTranscribedPageListByDocId($doc_id);

            // Iterate over transcribed pages
            foreach ($pages_transcribed as $page) {

                // Get pageID and number of columns of the page
                $page_id = $this->getPageID($doc_id, $page);
                $page_info = $this->dm->getPageInfo($page_id);
                $num_cols = $page_info['num_cols'];

                for ($col = 1; $col <= $num_cols; $col++) {

                    // Check if there really is a transcription in the column
                    $versions = $this->dm->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
                    if (count($versions) === 0) {
                        // no transcription in this column
                        continue;
                    }

                    // Check if a new transcription was made or an existing one was changed
                    $transcription_status = $this->transcriptionStatus($this->client, $this->indexName, $doc_id, $page, $col);

                    // Get all indexing-relevant data from the SQL database
                    $title = $this->getTitle($doc_id);
                    $seq = $this->getSeq($doc_id, $page);
                    $foliation = $this->getFoliation($doc_id, $page);
                    $transcriber = $this->getTranscriber($doc_id, $page, $col);
                    $page_id = $this->getPageID($doc_id, $page);
                    $lang = $this->getLang($doc_id, $page);
                    $transcript = $this->getTranscript($doc_id, $page, $col);

                    // FIRST CASE – Transcript does not exist in current index - index new transcript!
                    if ($transcription_status['exists'] === 0) {

                        // Generate unique ID for new entry
                        $opensearch_id_list = $this->getIDs($this->client, $this->indexName);
                        $max_id = max($opensearch_id_list);
                        $opensearch_id = $max_id + 1;

                        // Add new transcription to index
                        $this->indexCol($opensearch_id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcript, $lang);
                        sleep(1); // Without this errors can occur probably because OpenSearch updates slower than this php code runs

                    } else { // SECOND CASE – Transcript exists - update transcriber value!

                        // Get OpenSearch ID of changed column
                        $opensearch_id = $transcription_status['id'];

                        // Update index
                        $this->client->update([
                            'index' => $this->indexName,
                            'id' => $opensearch_id,
                            'body' => [
                                'doc' => [
                                    'transcriber' => $transcriber
                                ]
                            ]
                        ]);

                        $this->logger->debug("Index 'transcripts' – OpenSearch-ID $opensearch_id – 'transcriber' was updated with value $transcriber!");
                    }
                }
            }
        }

        return true;
    }
}