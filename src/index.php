<?php
/**
 * @file index.php
 * @brief Entry point for APM
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 * 
 * 
 * This is the first skeleton version of the app, at this point it just 
 * provides a simple login page and shows a fake list of documents.
 * 
 */

require 'appage.php';

$p = new ApPage('Home');

$db = $p->db;

$p->startPage(); ?>
<div class="container">
<h1>Documents</h1>
<?php

$docIds = $db->getDocIdList();
foreach ($docIds as $docId){
    $numPages = $db->getPageCountByDocId($docId);
    $numLines = $db->getLineCountByDoc($docId);
    $numTranscribedPages = $db->getTranscribedPageCountByDoc($docId);
    $editors = $db->getEditorsByDocId($docId);
    $docInfo = $db->getDoc($docId);
    $tableId = "doc-$docId-table";
    
    print "<h3>" . $docInfo['title'] . "</h3>"; 
    print "<p>$numTranscribedPages of $numPages pages transcribed ";
    print "<a title=\"View Page List\" data-toggle=\"collapse\" data-target=\"#". $tableId . "\"><span class=\"glyphicon glyphicon-list\"></span></a></p>\n";
    print "<div class=\"collapse pagetablediv\" id=\"" . $tableId . "\">\n";
    print printPageTable($db, $docId);
    print "</div>\n";
    if ($numLines != 0){
        print "<p>$numLines total lines transcribed</p>\n";
        print "<p>Editors: ";
        end($editors);
        $lastKey = key($editors);
        foreach($editors as $key => $e){
            $editorInfo = $db->loadUserInfoByUsername($e);
            print $editorInfo['fullname'];
            if ($key === $lastKey){
                print "";
            }
            else {
                print ", ";
            }
        }
        print "</p>";
    }
    $i++;
}

?>

</div>
<?php

$p->closePage();

function printPageTable($db, $docId, $class='pagetable'){
    $nLinesPerRow = 10;
    $pages = $db->getPageListByDocId($docId);
    $totalPages = $db->getPageCountByDocId($docId);
     if ($totalPages > 200){
        $nLinesPerRow = 25;
    }
    $n = 0;
    $t = "<table class=\"$class\">\n";
    for($nPage = 1; $nPage <= $totalPages; $nPage++){
        if ($n == $nLinesPerRow){
            $t = $t . "</tr>\n<tr>\n";
            $n = 0;
        }
        if (array_search($nPage, $pages) !== FALSE){
            $t = $t . "<td>";
        }
        else {
            $t = $t . '<td class="grayed">';
        }
        $t = $t . "<a title=\"View Page\" href=\"pageviewer.php?d=$docId&p=$nPage\">$nPage</a></td>\n";
        $n++;
    }
    $t = $t . "</tr></table>\n";
    return $t;
}