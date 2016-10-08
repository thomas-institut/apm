<?php
/**
 * @file loadtranscription.php
 * 
 * @brief Script to load a manuscript transcription file into the database
 * 
 * 
 *   
 *  
 * 
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */




function fastForwardToElement($reader, $element, $errorContext, $ignoreOthers=FALSE, $doNotDieOnEnd = FALSE){
    // This function is ugly!!!
    //print("DEBUG: --------- FF to $element in $errorContext -------------\n");
    if (!$reader->read()){
        if (!$doNotDieOnEnd){
            return FALSE;
        }
        die("ERROR: End of file. " . $errorContext);
    }
 
    while($reader->nodeType !== XMLReader::ELEMENT){
        //print ("DEBUG:  NodeType = " . $reader->nodeType . "\n");
        if (!$reader->read()){
            if (!$doNotDieOnEnd){
            return FALSE;
            }
            die("ERROR: End of file. " . $errorContext);
        }
    }
    
    while ($reader->name !== $element){
        //print ("DEBUG: Got element = " . $reader->name . "\n");
        if ($ignoreOthers){
            print "WARNING: Ignoring element " . $reader->name . ". " . $errorContext . "\n";
            $reader->next();
            // Skip whitespace nodes between same level elements
            while ($reader->nodeType === XMLReader::SIGNIFICANT_WHITESPACE){
                $reader->next();
            }
        }
        else {
            die("ERROR: Got '" . $reader->name . "' " . $errorContext);
        }
    }
    //print ("DEBUG: **** end successful FF ****\n");
    return TRUE;
}

function nextElementAtSomeDepth($reader, $element, $depth ){
    $found = FALSE;
    
    while (!$found){
        if (!$reader->read()){
            return FALSE;
        }
        if ($reader->nodeType === XMLReader::ELEMENT 
                && $reader->name === $element
                && $reader->depth === $depth){
            $found = TRUE;
        }
    }
    return TRUE;
    
}

function processTranscriptionText($reader, $dare_id, $page_no, $col, $line, $elementId, $elementName){
    $text = '';
    $nElementsAdded = 0;
    $inElement = TRUE;
    
    while ($inElement){
        if(!$reader->read()){
            die("ERROR: End of file while processing $elementId\n");
        }
        
        switch ($reader->nodeType){
            case XMLReader::TEXT:
                $text = $text . $reader->readString();
                break;
            
            case XMLReader::ELEMENT:
                switch($reader->name){
                    case 'choice':
                        $theChoice = simplexml_load_string($reader->readOuterXML());
                        $pos = strlen($text);
                        $len = strlen($theChoice->abbr);
                        $text = $text + $theChoice->abbr;
                        $nElementsAdded++;
                        print $elementId+$nElementsAdded . ", $dare_id, $page_no, $col, $line, choice, $pos, $len," . $theChoice->expan . "\n";
                        $reader->next();
                        break;
                        
                    default: 
                        print "ERROR: unrecognized element " . $reader->name . "\n";
                }
                break;
            
            case XMLReader::END_ELEMENT:
                $inElement = FALSE;
                break;
            
            default: 
                print "DEBUG: Got nodetype = " . $reader->nodeType . "\n";
        }
        
    }
    //$text = $reader->readString();
    $nElementsAdded++;
    print "$elementId, $dare_id, $page_no, $col, $line, $elementName, $text\n";
    return $nElementsAdded;
}

if (isset($argv[1])){
    $filename = $argv[1];
}
else {
    die("Please give a filename to load.\n");
}

$reader = new XMLReader();
$reader->open($filename);

fastForwardToElement($reader, 'TEI', "Looking for TEI element");

fastForwardToElement($reader, 'teiHeader', "Looking for teiHeader inside TEI element");
$theHeader = simplexml_load_string($reader->readOuterXml());
$editorName = $theHeader->fileDesc->titleStmt->editorId->name;
if ($editorName === '' or $editorName === NULL){
    die("ERROR: No editor name given in TEI -> fileDesc -> titleStmt");
}
print "Editor: $editorName\n";
$reader->next();

fastForwardToElement($reader, 'text', "Looking for text element");
if ($reader->getAttribute('xml:lang') === NULL){
    die("ERROR: need xml:lang in the text element");
}
else{
    $textLanguage = $reader->getAttribute('xml:lang');
}
print "Text language: $textLanguage\n";
fastForwardToElement($reader, 'body', "Looking for body element");
fastForwardToElement($reader, 'div', 'Looking for first div');

// Process divs, ignore other elements inside body
$endOfFile = FALSE;
$depth = $reader->depth;
$col = 0;
$elementId = 1;
while (!$endOfFile){
    $type = $reader->getAttribute('type');
    if ($type === NULL){
        die("ERROR: no type attribute in div\n");
    }
    if ($type !== 'page'){
        // Warn and ignore
        print ("WARNING: Ignoring div of type: $type\n");
    }
    else {
        $facs = $reader->getAttribute('facs');
        if ($facs === NULL){
            die("ERROR: div without a facs attribute\n");
        }
        else{
            $dare_id = substr($facs, 0, strlen($facs)-5 );
            $page_no = (int) substr($facs, -4);
            $line_no = 0;
            //print "PAGE: $dare_id, $page_no\n";
            // Process div elements
            $stillInDiv = TRUE;
            while ($stillInDiv){
                if (!$reader->read()){
                    die("ERROR: File ended while still inside a div\n");
                }
                switch ($reader->nodeType){
                    case XmlReader::ELEMENT:
                        $elementName = $reader->name;
                        switch($elementName){
                            case 'l':
                                $line_no++;
                            case 'head':
                            case 'fw':
                                $n = processTranscriptionText($reader, $dare_id, $page_no, $col, $line_no, $elementId, $elementName);
                                $elementId = $elementId + $n;
                                break;
                            
                            case 'add':
                                // Process other stuff
                                break;
                            
                            default: 
                                die("ERROR: unrecognized element inside div:" . $reader->name . "\n");
                        }
                        // Process Text inside the element
                                                
                        //print "$elementId,$dare_id,$page_no,$line_no," . $reader->name . "," .$reader->readInnerXml() . "\n";
                        //$elementId++;
                        //$reader->next();
                        break;
                    
                    case XmlReader::END_ELEMENT:
                        if ($reader->name === 'div'){
                            $stillInDiv = FALSE;
                        }
                        break;        
                }
            }
            
        }
    }
    if (!nextElementAtSomeDepth($reader, 'div', $depth)){
        $endOfFile = TRUE;
    }
}




