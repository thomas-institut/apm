<?php
require '/home/lukas/apm/vendor/autoload.php';

$client = (new \OpenSearch\ClientBuilder())
    ->setHosts(['https://localhost:9200'])
    ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
    ->setSSLVerification(false) // For testing only. Use certificate for validation
    ->build();

$indexName = 'transcripts';

function addToIndex ($author, $title, $year, $id) {
    global $client, $indexName;

    $client->create([
        'index' => $indexName,
        'id' => $id,
        'body' => [
            'author' => $author,
            'book' => $title,
            'year' => $year
        ]
    ]);

    return true;
};

addToIndex('Test', ['Der logische Aufbau der Welt', 'Dies ist im Array.'], 1924, 1);

$client->indices()->delete([
    'index' => $indexName
]);
