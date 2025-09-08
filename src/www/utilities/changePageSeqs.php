#!/usr/bin/php -q
<?php


$docId = $argv[1] ?? -1;

if ($docId === -1) {
    print "Please enter a document database id\n";
    return 0;
}
$input = file_get_contents('php://stdin');

$lines = explode("\n", $input);

foreach ($lines as $line) {
    $parts = explode("\t", $line);
    if (count($parts) !== 2) {
        continue;
    }

    $pageNumber = intval($parts[0]);
    $newSeq = intval($parts[1]);

    print "UPDATE ap_pages SET seq = $newSeq WHERE doc_id=$docId and page_number=$pageNumber and valid_until = '9999-12-31 23:59:59.999999';\n";

}