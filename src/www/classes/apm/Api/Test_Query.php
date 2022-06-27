<?php
namespace APM\Api;

use phpDocumentor\Reflection\Types\Null_;
use PhpParser\Error;
use PHPUnit\Util\Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

require '/home/lukas/apm/vendor/autoload.php';

set_time_limit(5); // Script should not run longer than 5 seconds - does this work like this?



function search($word)
    {

        // Arrays for structuring queried data
        $titles = [];
        $pages = [];
        $transcribers = [];
        $pageIDs = [];
        $docIDs = [];
        $transcripts = [];

        $results = [];

        // Variable for communicating errors
        $status = 'OK';

        // Get user input and current time
        $keyword = $word;

        // Setup OpenSearch php client
        try {
            $client = (new \OpenSearch\ClientBuilder())
                ->setHosts(['https://localhost:9200'])
                ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
                ->setSSLVerification(false) // For testing only. Use certificate for validation
                ->build();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return false;
        }

        // Set the name of the index
        $indexName = 'transcripts';

        // Query the index
        $query = $client->search([
            'index' => $indexName,
            'body' => [
                'size' => 10000,
                'query' => [
                    'match_phrase_prefix' => [
                        'transcript' => [
                            "query" => $keyword
                            // "analyzer" => "standard"
                        ]
                    ]
                ]
            ]
        ]);

        $numMatches = $query['hits']['total']['value'];

        // Collect all matches in an ordered array
        if ($numMatches != 0) {
            for ($i = 0; $i < $numMatches; $i++) {
                $titles[$i] = $query['hits']['hits'][$i]['_source']['title'];
                $pages[$i] = $query['hits']['hits'][$i]['_source']['page'];
                $transcribers[$i] = $query['hits']['hits'][$i]['_source']['transcriber'];
                $transcripts[$i] = $query['hits']['hits'][$i]['_source']['transcript'];
                $docIDs[$i] = $query['hits']['hits'][$i]['_source']['docID'];
                $pageIDs[$i] = $query['hits']['hits'][$i]['_id'];
                $keywordFreq = substr_count ($transcripts[$i], $keyword) + substr_count ($transcripts[$i], ucfirst($keyword));

                // Create an array $csKeywordsWithPos with pairs in the following form [case sensitive keyword, position in transcript]
                $csKeywordsWithPos = getCaseSensitiveKeywordsWithPositions($keyword, $transcripts[$i], $keywordFreq);

                // Get context of every occurence of the keyword
                $keywordsInContext = [];

                foreach ($csKeywordsWithPos as $csKeywordWithPos) {
                    $keywordInContext = getContext($transcripts[$i], $csKeywordWithPos[1]);
                    $keywordsInContext[] = $keywordInContext;
                }

                $results[$i] = [
                    'title' => $titles[$i],
                    'page' => $pages[$i],
                    'transcriber' => $transcribers[$i],
                    'pageID' => $pageIDs[$i],
                    'docID' => $docIDs[$i],
                    'transcript' => $transcripts[$i],
                    'keywordFreq' => $keywordFreq,
                    'csKeywordsWithPos' => $csKeywordsWithPos,
                    'keywordsInContext' => $keywordsInContext
                ];
            }
        }

        print_r ($results[2]['csKeywordsWithPos']);
        echo ($numMatches);

        return true;
    }

function getCaseSensitiveKeywordsWithPositions ($keyword, $transcript, $keywordFreq) {

    // Create an array $csKeywordsWithPos, which contains arrays of the form [case sensitive keyword, position in transcript] and a position index $pos
    $csKeywordsWithPos = [];
    $pos = 0;

    // Iterate $keywordFreq times
    for ($j=0; $j < $keywordFreq; $j++) {

        // First time, get the whole transcript, in every iteration get a sliced version, which excludes preceding occurences of the keyword
        $transcript = substr($transcript, $pos);

        // Get position of next lower case occurence and next upper case occurence of the keyword
        $lowerCasePos = strpos($transcript, $keyword);
        $upperCasePos = strpos($transcript, ucfirst($keyword));

        // Check if next occurence of the keyword is lower case or upper case
        if ($lowerCasePos !== false and $lowerCasePos < $upperCasePos or $upperCasePos == false) {

            // Append nearest uncapitalized keyword with its position to $csKeywordsWithPos array
            $csKeywordsWithPos[$j] = [$keyword, $pos + $lowerCasePos, $pos, $lowerCasePos, $transcript];

            // Calculate offset for slicing transcript
            $pos = $pos + $lowerCasePos + strlen($keyword);
        }
        else {

            // Append nearest capitalized keyword with its position to $csKeywordsWithPos array
            $csKeywordsWithPos[$j] = [ucfirst($keyword), $pos + $upperCasePos];

            // Calculate offset for slicing transcript
            $pos = $pos + $upperCasePos + strlen($keyword);
        }
    }

    return $csKeywordsWithPos;
}

function getContext ($transcript, $pos, $cSize = 100): string
{

    // Get position of the keyword
    // $pos = strpos($transcript, $keyword);

    $preChars = ""; // Will hold the preceding characters (words) of the keyword
    $sucChars = ""; // Will hold the succeeding characters (words) of the keyword
    $numPreChars = $pos;
    $numSucChars = strlen($transcript)-$pos;

    // Get the characters (words) that precede the keyword
    for ($i=1; $i<$cSize; $i++) {

        // Get next character, if there is one
        if ($i<$numPreChars) {
            $char = $transcript[$pos-$i];
        }
        else {
            $preChars = strrev($preChars); // Reverse string to have characters (words) in right order
            break;
        }

        // Stop getting more context, if some preceding characters have already been catched and the current character is a period
        if ($i>($cSize*0.2) && $char== ".") {
            if (substr($preChars, -1) == " ") { // remove blank space at the end of $prechars, if necessary
                $preChars = substr($preChars, 0, -1);
            }
            $preChars = strrev($preChars); // Reverse string to have characters (words) in right order
            break;
        }

        // Stop getting more context, if many preceding characters have already been catched and the current character is whitespace or colons
        if ($i>($cSize*0.7) and ($char == " " or $char == ":")) {
            $preChars = $preChars . "...";
            $preChars = strrev($preChars); // Reverse string to have characters (words) in right order
            break;
        }

        // Append new character to preceding context
        $preChars = $preChars . $char;
    }

    // Get the words, that succeed the keyword (including itself)
    for ($i=0; $i<$cSize; $i++) {

        // Get the next character, if there is one
        if ($i<$numSucChars) {
            $char = $transcript[$pos+$i];
        }
        else {
            break;
        }


        // Stop getting more context, if many succeeding characters are already catched and the current character is whitespace. colons or comma
        if ($i>($cSize*0.7) and ($char == " " or $char  == ":" or $char == ",")) {
            $sucChars = $sucChars . "...";
            break;
        }

        // Append new character to succeeding context
        $sucChars = $sucChars . $char;

        // Stop getting more context, if some succeeding characters are already catched and the current character is a period
        if ($i>($cSize*0.2) and $char == ".") {
            break;
        }

    }

    return $preChars . $sucChars;
}

$test = 'nerabilium. Ergo prima materia
et suum subiectum sunt unum numero,
scilicet unum subiectum. Et omne quod est cum
suo subiecto, ex quo generatur,  unum
numero est antequam sit. Ergo prima materia est antequam sit, quod est impossibile. Et hoc impossibile sequitur ex
hoc, quod posuimus, quod prima materia est generabilis. Et hoc modo argumentationis declaravit ipsam esse non corruptibilem
per se. Sequitur enim ut sit corrupta antequam corrumpatur. Deinde dixit: Dico enim naturam etc., idest intelligo 
enim cum dico naturam primum subiectum quod est in potentia, non subiectum ex quo generatur res et est in actu; et ge-
neratum ex eo est existens per se, non per accidens. Hoc enim secundum subiectum et primum conveniunt in hoc, quod generatum
invenitur ex eis per se; et differunt in hoc, quod primum est in potentia et secundum in actu aut modo medio inter po-
tentiam et actum, sicut est dispositio in illo quod generatur ex pluribus uno subiecto. Et dixit hoc quia si non ponatur
in generatione materie primum subiectum, scilicet in potentia, non contingit ut sit cum materia unum in numero
et sic non accidit impossibile predictum. Et ideo excitavit audientem ad intelligendum ex hoc quod dixit, quod
si prima materia generatur, indiget subiecto, idest primo subiecto.
Cum notificavit principia esse
tria, duo per se, scilicet forma et materia,
et unum per accidens, scilicet privatio,
et iam declaravit primam mater-
iam esse de istis principiis, dicit:
Considerare autem de principio secundum
formam etc., idest considerare autem
de primo principio formali, utrum
sit unum aut plura, et que est
substantia eius, est proprium prime philosophie.
Formarum enim alie sunt in ma-
teriis, alie non in materiis, ut
declaratum est in hac scientia. Et ideo
consideratio de formis duarum est scienti-
arum, quarum una, scilicet naturalis,
considerat de formis materialibus,
secunda autem de formis simplicibus
abstractis a materia; et est illa scientia que
considerat de ente simpliciter.
Sed notandum est quod istud genus en-
tium, esse scilicet separatum a materia,
non declaratur nisi in hac scientia
naturali. Et qui dicunt quod prima
philosophia nititur declarare entia
esse separabilia, peccat. Hec enim
entia sunt subiecta prime philosophie.
Et declaratum est in Posteriori-
bus Analyticis, quod impossibile est aliquam
scientiam declarare suum subiectum esse,
set concedit ipsum esse aut quia est manifestum
per se, aut quia est demonstratum in alia scientia. Unde Avicenna peccavit
maxime cum et processit in hoc in suo libro cum dixit quod primus philosophus demonstravit primum principium esse et pro-
cessit in hoc in suo libro De scientia divina per viam, quam estimavit esse necessariam et essentialem in illa scientia. Et pecca-
vit peccato manifesto. Certior enim illorum sermonum quibus usus est in hoc non pertransit ordinem sermonum probabi-
lium. Et iam innuimus hoc alibi. Et peius est hoc quod dixit, quod ista scientia accipit a primo philosopho corpora componi ex ma-
teria et forma . Negligens est ne alia via ad sciendum hoc nisi ex transmutatione existente in substantia.
Set sicut dicit Aristoteles, phisicus declarat substantiam materie quae sit perfecte per compositionem eius ad omnes differen-
tias entium secundum quod sunt entia. Ergo impossibile est declarare ipsam esse nisi in hac scientia. Deinde dixit:
Quoniam iam determinavimus per hunc sermonem etc., et intendit cum dixit: Et que sunt formam
et materiam. Et cum dixit: Et quot sunt, intendit duo per se et tertium per accidens. Deinde dixit: Et
nos intendimus etc., et innuit hoc, quod incipere vult in secundo tractatu de natura, quid sit, de-
inde de numeratione specierum et causarum. Et forte innuit primum principium movens, quod decla-
ratum est in fine istius libri. Omne enim de quo loquitur in hoc libro principaliter est propter illud
principium. Et ille est primus locus in quo naturalis inspicit alium modum essendi ab illo de quo
considerat et apud illum cessat. Et dimisit considerationem de eo usque ad scientiam nobiliorem que
considerat de ente secundum quod est ens. Et totum hoc est quasi contrarium eius quod estimavit Avicenne';

print_r ([substr($test, 1647+7+491+7+90+7+314+7+394+7 ), strpos(substr($test, 1647+7+491+7+90+7+314+7+394+7 ), 'philoso')]);

// search('philoso');


