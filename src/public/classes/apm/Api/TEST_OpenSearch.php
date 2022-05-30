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



// Function to search the index

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

        return $result['hits'];

    }

// Search for keyword and print the result
print_r(search_for_keyword("Kant"));
