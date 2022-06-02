<?php
require '/home/lukas/apm/vendor/autoload.php';

$client = (new \OpenSearch\ClientBuilder())
    ->setHosts(['https://localhost:9200'])
    ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
    ->setSSLVerification(false) // For testing only. Use certificate for validation
    ->build();

$indexName = 'philosophers';

function addToIndex ($author, $book, $year, $id) {
    global $client, $indexName;

    $client->create([
        'index' => $indexName,
        'id' => $id,
        'body' => [
            'author' => $author,
            'book' => $book,
            'year' => $year
        ]
    ]);
    return "Indexed new document.";
};

addToIndex('Neurath', 'Empirische Soziologie', 1928, 6);
