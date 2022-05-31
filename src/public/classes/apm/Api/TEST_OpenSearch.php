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

/*
// Clear/Delete index
$client->indices()->delete([
    'index' => $indexName
]);

// Create an index with non-default settings.
$client->indices()->create([
    'index' => $indexName,
]);

$client->create([
    'index' => $indexName,
    'id' => 1,
    'body' => [
        'author' => 'Kant',
        'opus' => 'Kritik der reinen Vernunft',
        'year' => 1787
    ],
]);

$client->create([
    'index' => $indexName,
    'id' => 2,
    'body' => [
        'author' => 'Cassirer',
        'opus' => 'Philosophie der symbolischen Formen',
        'year' => 1923
    ],
]);
*/

// Function to search the index
$indexName = 'philosophers';
function search_for_keyword ($keyword)
    {
        global $client, $indexName;

        $result = $client->search([
                'index' => $indexName,
                'body' => [
                    'query' => [
                        'multi_match' => [
                            'query' => $keyword,
                            'fields' => ['author', 'opus']
                        ]
                    ]
                ]
            ]);

        if ($result['hits']['total']['value'] == 0) {
            return "There is no match in the database for the keyword '$keyword'.";
        }
        else {
            $docID = $result['hits']['hits']['0']['_id'];
            $author = $result['hits']['hits']['0']['_source']['author'];
            $book = $result['hits']['hits']['0']['_source']['book'];
            return "The book '$book' of '$author' matches your search. The corresponding document has the ID $docID.";
        }
    }

// Search for keyword and print the result
print_r(search_for_keyword("Kant"));
