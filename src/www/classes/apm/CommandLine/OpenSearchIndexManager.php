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

use OpenSearch\Client;

/**
 * Description of OpenSearchIndexManager
 *
 * Abstract class for Commandline utilities to index texts in OpenSearch based on a sql-database
 *
 * @author Lukas Reichert
 */

abstract class OpenSearchIndexManager extends CommandLineUtility {

    protected Client $client;
    protected array $indices;

    // Function to encode the text – makes it suitable for the exec-command
    public function encodeForLemmatization(string $text): string {

        // Replace line breaks, blanks, brackets...these character can provoke errors in the exec-command
        $text_clean = str_replace("\n", "#", $text);
        $text_clean = str_replace(".", " .", $text_clean);
        $text_clean = str_replace(",", " ,", $text_clean);
        $text_clean = str_replace(" ", "#", $text_clean);
        $text_clean = str_replace("(", "%", $text_clean);
        $text_clean = str_replace(")", "§", $text_clean);
        $text_clean = str_replace("׳", "€", $text_clean);
        $text_clean = str_replace("'", "\'", $text_clean);
        $text_clean = str_replace("\"", "\\\"", $text_clean);
        $text_clean = str_replace(' ', '#', $text_clean);
        $text_clean = str_replace(' ', '#', $text_clean);
        $text_clean = str_replace('T.', '', $text_clean);
        $text_clean = str_replace('|', '+', $text_clean);
        $text_clean = str_replace('<', '°', $text_clean);
        $text_clean = str_replace('>', '^', $text_clean);
        $text_clean = str_replace(';', 'ß', $text_clean);
        $text_clean = str_replace('`', '~', $text_clean);
        $text_clean = str_replace('[', '', $text_clean);
        $text_clean = str_replace(']', '', $text_clean);


        // Remove numbers
        for ($i=0; $i<10; $i++) {
            $text_clean = str_replace("$i", '', $text_clean);
        }

        // Remove repetitions of hashtags
        while (strpos($text_clean, '##') !== false) {
            $text_clean = str_replace('##', '#', $text_clean);
        }

        // Remove repetitions of periods
        while (strpos($text_clean, '.#.') !== false) {
            $text_clean = str_replace('.#.', '', $text_clean);
        }

        while (strpos($text_clean, '..') !== false) {
            $text_clean = str_replace('..', '', $text_clean);
        }

        // Remove repetitions of hashtags again (in the foregoing steps could be originated new ones..)
        while (strpos($text_clean, '##') !== false) {
            $text_clean = str_replace('##', '#', $text_clean);
        }

        // text should not begin or end with hashtag
        if (substr($text_clean, 0, 1) === '#') {
            $text_clean = substr($text_clean, 1);
        }

        if (substr($text_clean, -1, 1) === '#') {
            $text_clean = substr($text_clean, 0, -1);
        }

        return $text_clean;
    }

    protected function resetIndex ($client, string $index): bool {

        // Delete existing index
        if ($client->indices()->exists(['index' => $index])) {
            $client->indices()->delete([
                'index' => $index
            ]);
            $this->logger->debug("Existing index *$index* was deleted!\n");
        };

        // Create new index
        $client->indices()->create([
            'index' => $index,
            'body' => [
                'settings' => [
                    'index' => [
                        'max_result_window' => 50000
                    ]
                ]
            ]
        ]);

        $this->logger->debug("New index *$index* was created!\n");

        return true;
    }

    // Function to get a full list of all OpenSearch-IDs in the index
    public function getIDs ($client, string $index_name): array
    {

        // Array to return
        $opensearch_ids = [];

        // Make a match_all query
        $query = $client->search([
            'index' => $index_name,
            'size' => 20000,
            'body' => [
                "query" => [
                    "match_all" => [
                        "boost" => 1.0
                    ]
                ],
            ]
        ]);

        // Append every id to the $opensearch_ids-array
        foreach ($query['hits']['hits'] as $column) {
            $opensearch_id = $column['_id'];
            $opensearch_ids[] = $opensearch_id;
        }

        return $opensearch_ids;
    }

}