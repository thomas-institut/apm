<?php
namespace APM\Api;

// Preparation for integrating a search functionality in the APM with OpenSearch
// Task: Make an index with some entries, write a function that searches for a keyword in this index

require '/home/lukas/apm/vendor/autoload.php';
// Unsure, if this is the right location for the vendor directory - there is another one in .../apm/src/public

// Make an index

$client = (new \OpenSearch\ClientBuilder())
    ->setHosts(['https://localhost:9200'])
    ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
    ->setSSLVerification(false) // For testing only. Use certificate for validation
    ->build();

$indexName = 'philosophers';

// Function to search the index

function search_for_keyword ($keyword)
    {
        global $client, $indexName;

        // Query the index
        $result = $client->search([
                'index' => $indexName,
                'body' => [
                    'query' => [
                        'multi_match' => [
                            'query' => $keyword,
                            'fields' => ['author', 'book']
                        ]
                    ]
                ]
            ]);


        if ($result['hits']['total']['value'] == 0) { // no matches for searched keyword
            return "There is no match in the database for the keyword '$keyword'.";
        }
        elseif ($result['hits']['total']['value'] == 1) { // exactly one match for the searched keyword
            $docID = $result['hits']['hits']['0']['_id'];
            $author = $result['hits']['hits']['0']['_source']['author'];
            $book = $result['hits']['hits']['0']['_source']['book'];
            return "There is one match for your search, namely the book '$book' of '$author' (Document ID $docID).";
        }
        else{ // more than one match for the searched keyword
            $numMatches = $result['hits']['total']['value'];
            $docIDs = [];
            $authors = [];
            $books = [];
            $enumMatches = "";

            // Collect all matches and enumerate them in a string
            for ($i = 0; $i <= $numMatches-1; $i++) {
                $docIDs[$i] = $result['hits']['hits'][$i]['_id'];
                $authors[$i] = $result['hits']['hits'][$i]['_source']['author'];
                $books[$i] = $result['hits']['hits'][$i]['_source']['book'];
                if ($i != $numMatches-1 and $i != $numMatches-2) { // affects all matches besides penultimate and ultimate match
                    $enumMatches = $enumMatches . "the book '$books[$i]' of '$authors[$i]' (Document ID $docIDs[$i]), ";
                }
                elseif ($i != $numMatches-1) { // affects penultimate match
                    $enumMatches = $enumMatches . "the book '$books[$i]' of '$authors[$i]' (Document ID $docIDs[$i]) ";
                }
                else { // affects ultimate match
                    $enumMatches = $enumMatches . "and the book '$books[$i]' of '$authors[$i]' (Document ID $docIDs[$i]).";
                }
            }

            return "There are $numMatches matches for your search, namely " . $enumMatches;
        }
    }

// Search for keyword and print the result
print_r(search_for_keyword("Vernunft"));
