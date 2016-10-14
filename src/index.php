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
 <section id="Manuscripts">
<h1>Manuscripts</h1>
<?php

$manuscripts = $db->getManuscriptList();

print "<ul>\n";
foreach ($manuscripts as $mss){
    $numPages = $db->getPageCountByDoc($mss);
    $numLines = $db->getLineCountByDoc($mss);
    $editors = $db->getEditorsByDoc($mss);
    $pages = $db->getPageListByDoc($mss);
    print "<li>"; 
    print "<p>$mss</p>\n";
    print "<p>$numPages pages: <br/>";
    $nLinesPerRow = 10;
    $n = 0;
    foreach ($pages as $page){
        if ($n == $nLinesPerRow){
            print "<br/>";
            $n = 0;
        }
        print "<a title=\"View Page\" href=\"pageviewer.php?doc=$mss&page=$page\">[$page]</a>&nbsp;";
        $n++;
    }
    print "</p>\n";
    print "<p>$numLines total lines</p>\n";
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
    print "</li>\n";
}

print "</ul>\n";
?>
            
</section>


<?php

$p->closePage();

?>