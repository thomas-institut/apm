<?php
/* 
 * Copyright (C) 2016 Universtität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

if (!isset($_GET['doc']) or !isset($_GET['page'])){ ?>
<!DOCTYPE html>
<html>
    <body
        <h1>Oops!</h1>
        <p>No document or page number given!</p>
        <p><a href="index.php">[ Home ]</a></p>
</body>
</html>
<?php  
die();
}

require_once 'apdata.php';
require_once 'params.php';
require_once 'config.php';

$mss = $_GET['doc'];
$page = $_GET['page'];

$db = new ApData($config, $params['tables']);

$pageList = $db->getPageListByDoc($mss);

$pindex = array_search($page, $pageList);
if ($pindex === FALSE){
    $page = $pageList[0];
    $pindex = 0;
}

$prevButtonDisabled='';
$prevPage = 0;
if ($pindex === 0){
    $prevButtonDisabled='disabled';
    $prevPage = '-';
}
else {
    $prevPage = $pageList[$pindex-1];
}

$nextButtonDisabled='';
$nextPage = 0;
if ($pindex === (count($pageList)-1)){
    $nextButtonDisabled='disabled';
    $nextPage = '-';
} 
else{
    $nextPage = $pageList[$pindex+1];
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Averroes Page Viewer</title>
    <link rel="stylesheet" type="text/css" media="screen" href="https://fonts.googleapis.com/css?family=PT+Sans"/>
    <link rel="stylesheet" type="text/css" media="screen" href="styles.css" />
    <link rel="stylesheet" type="text/css" media="screen" href="css/bootstrap.css">
    <link rel="stylesheet" type="text/css" media="screen" href="pageviewer.css" />
    <link rel="stylesheet" type="text/css" media="screen" href="splitpane.css" />
    <script type="application/javascript" src="jquery-3.1.1.js"></script>
    <script type="application/javascript" src="bootstrap.js"></script>
    <script type="application/javascript" src="openseadragon.min.js"></script>
    <script type="application/javascript" src="splitpane.js"></script>
    <script type="application/javascript" src="pageviewer.js"></script>
</head>
<body>
<div id="viewerheader">
    <table width="100%">
        <tr>
            <td width="40%">
                <a href="index.php"><img src="images/averroes-logo-250.png"></a>
                <span class="textonly" style="margin-left: 30px"><?php print $mss; ?></span>
            </td>
            <td><ul class="pv-navbar"> 
                    <li style="float: left;">
                        <button class="textonly headerbutton" 
                                title="Previous Page: <?php print $prevPage; ?>" 
                                onclick="window.location='pageviewer.php?doc=<?php print $mss; ?>&page=<?php print $prevPage; ?>';" <?php print $prevButtonDisabled ?>>
                            <span class="glyphicon glyphicon-step-backward"></span>
                        </button>
                    </li>
                    <li style="float:left">
                        <button class="textonly headerbutton">
                            <?php print "Page $page" ?>
                        </button>
                    </li>
                    <li style="float: left;">
                        <button class="textonly headerbutton"
                                title="Next Page: <?php print $nextPage; ?>" 
                                onclick="window.location='pageviewer.php?doc=<?php print $mss; ?>&page=<?php print $nextPage; ?>';" <?php print $nextButtonDisabled ?>>
                            <span class="glyphicon glyphicon-step-forward"></span>
                        </button>
                    </li>

                </ul></td>
            <td>
                <ul class="pv-navbar"> 
                    <li style="float:left">
                        <button title="Make Text Smaller" class="textonly headerbutton"
                                onclick="changeDocumentFontSize(false);"><span class="glyphicon glyphicon-zoom-out"></span></button></li>
                    <li style="float:left">
                        <button title="Make Text Bigger" class="textonly headerbutton"
                                onclick="changeDocumentFontSize(true);"><span class="glyphicon glyphicon-zoom-in"></span></button></li>

                </ul>
            </td>
            <td><ul class="pv-navbar"> 
                    <li style="float: right;">
                        <button title="Exit Viewer" class="textonly headerbutton"
                                onclick="window.location='index.php';">
                            <span class="glyphicon glyphicon-off"></span>
                        </button>
                    </li>
                </ul></td>
        </tr>
    </table>
</div> <!-- viewerheader -->

<div id="container">
        <div class="split-pane vertical-percent">
        <?php
        // The idea is to change the order of the 
        // image and text containers depending on the
        // direction of the text, but I still need to
        // play with CSS to do that. For the time
        // being this doesn't do anything really
        //if ($db->isPageRightToLeft($mss, $page)){
            printImageContainer();
            printDivider();
            printPageTextContainer();
        //}
        //else{
        //    printPageTextContainer();
        //    printDivider();
        //    printImageContainer();
        //}
        ?>
        </div>
</div>
    </body>
</html>        
<?php

function printImageContainer(){
    global $db, $mss, $page;
?>
            <div class="split-pane-component" id="left-component">
            </div>
            
            <script type="text/javascript">
                var viewer = OpenSeadragon({
                    id: "left-component",
                    prefixUrl: "images/openseadragonimages/",
                    tileSources: {
                        type: 'image',
                        url:  '<?php print $db->getImageUrlByDoc($mss, $page);?>',
                        buildPyramid: false, 
                        homeFillsViewer: true
                    }
                });
            </script>
<?php
}

/**
 * 
 * @global ApData $db
 * @global string $mss
 * @global int $page
 * This is the meat of the page viewer!
 * For this first version I'm assuming:
 *  + One column per page
 *  + Only LINE elements
 *  + Only TEXT items
 */
function printPageTextContainer(){
    global $db, $mss, $page;
    
    print "<div class=\"split-pane-component\" id=\"right-component\">\n";
    print "<table class=\"textlines\">\n";

    $elements = $db->getColumnElements($mss, $page, 1);
    $rtl = ColumnElementArray::isRightToLeft($elements);
    $richTooltips = array();
    
    foreach ($elements as $e){
        switch ($e->type){
            case ColumnElement::LINE:
                $nLabel = $e->getLineNumber();
                $tooltipText = '';
                break;
            
            case ColumnElement::HEAD:
                $nLabel = 'H';
                $tooltipText = 'Head';
                break;
            
            case ColumnElement::CUSTODES:
                $nLabel = 'C';
                $tooltipText = 'Custodes';
                break;
            
            case ColumnElement::GLOSS:
                $nLabel = 'G';
                $tooltipText = 'Gloss';
                break;
            
            default:
                $nLabel = 'Unk';
                $tooltipText = 'Unsupported element';
                
        }
        print "<tr>";
        $seqtd = '<td class="linenumber" title="'. $tooltipText .  '">' . $nLabel . '</td>';
        $theText = '';
        foreach($e->transcribedText->theItems as $item){
            $htmlId = 'item' . $item->id;
            $classes = '';
            $ednotes = $db->getEditorialNotesByItemId($item->id);
            if ($ednotes !== NULL){
                $classes = 'hasednote';
            }
            switch($item->type){
                case TranscriptionTextItem::TEXT:
                    $classes = $classes . ' regulartext';
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '">' . $item->getText();
                    $theText = $theText .  "</span>";                   
                    break;
                
                case TranscriptionTextItem::RUBRIC:
                    $classes = $classes . ' rubric';
                    $theText = $theText . '<span class="'. $classes .  '" title="Rubric" id="' . $htmlId . '">' . $item->getText() . '</span>';
                    break;
                
                case TranscriptionTextItem::SIC:
                    $classes = $classes . ' sic';
                    $t = $item->getCorrection();
                    if ($t === ''){
                        $t = $item->theText;
                    }
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '" title="Sic">' . $t . '</span>';
                    $richTooltips[$htmlId]['type'] = 'sic';
                    $richTooltips[$htmlId]['text'] =  '<b>Original:</b> ' . $item->theText . '<br/><b>Correction:</b> ' . $item->getCorrection();
                    break;
                    
                case TranscriptionTextItem::ABBREVIATION:
                    $classes = $classes . ' abbr';
                    $t = $item->getExpansion();
                    if ($t === ''){
                        $t = $item->theText;
                    }
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '" title="Abbreviation">' . $t . '</span>';
                    $richTooltips[$htmlId]['type'] = 'sic';
                    $richTooltips[$htmlId]['text'] =  '<b>Original:</b> ' . $item->theText . '<br/><b>Expansion:</b> ' . $item->getExpansion();
                    break;
                
                case TranscriptionTextItem::MARK:
                    $classes = $classes . ' mark';
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '" title="Note(s)"><span class="glyphicon glyphicon-exclamation-sign"></span></span>';
                    break;
                
                case TranscriptionTextItem::UNCLEAR:
                    $classes = $classes . ' unclear';
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '" title="Unclear Text">' . $item->getText() . '</span>';
                    $richTooltips[$htmlId]['type'] = 'unclear';
                    $ttt = '';
                    if ($item->altText !== ''){
                        $ttt = $ttt . '<b>Alternative:</b> ' . $item->altText . '<br/>';
                    }
                    $ttt = $ttt . 'Reason: ' . $item->getReason();
                    $richTooltips[$htmlId]['text'] =  $ttt;
                    break;
                    
                case TranscriptionTextItem::ILLEGIBLE:
                    $classes = $classes . ' illegible';
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '" title="Illegible Text">' . $item->getText() . '</span>';
                    $richTooltips[$htmlId]['type'] = 'illegible';
                    $ttt = '';
                    if ($item->getReason() !== 'illegible'){
                        $ttt = $ttt . '<b>Reason:</b> ' . $item->getReason() . '<br/>';
                    }
                    $ttt = $ttt . '<b>Length:</b> ' . $item->getLength() . ' characters';
                    $richTooltips[$htmlId]['text'] =  $ttt;
                    break;
               
                default:
                    $theText = $theText . $item->getText();
            }  // switch($item->type)
            
            if ($ednotes !== NULL){
                if (!isset($richTooltips[$htmlId])){
                    $richTooltips[$htmlId]['type'] = 'ednote';
                    $richTooltips[$htmlId]['text'] = '';
                }
                $t = '<span class="tooltip-notes">';
                foreach ($ednotes as $en){
                    $t = $t . '<blockquote>';
                    $t = $t . '<p>' . $en->text . '</p>';
                    $t = $t . '<footer>' . $db->getUsernameById($en->authorId) . ' @ ' . $en->time . '</footer>';
                    $t = $t . '</blockquote>';
                    
                }
                $t = $t . '</ul></span>';
                $richTooltips[$htmlId]['text'] = $richTooltips[$htmlId]['text'] . $t;
            }
        } // foreach transcribedTextItem
        $texttd = '<td class="text-'. $e->transcribedText->lang . '">' . $theText . "</td>";
        if ($rtl){
            print $texttd;
            print $seqtd;
        }
        else{
            print $seqtd;
            print $texttd;
        }
        print "</tr>\n";
    }
                    
    print "</table>\n";
    print "</div>\n";
    
    // Generate tooltips (actually bootstrap.js popovers)
    print "<script>\n";
    foreach($richTooltips as $id => $tooltip){
        if ($tooltip['type']==='ednote'){
            print "$(\"#" . $id . "\").popover({title:'Note(s)', content: '" . addslashes($tooltip['text']) ."' , container: 'body', html: true, placement: 'auto', trigger: 'hover' });\n";
        }else {
            print "$(\"#" . $id . "\").popover({content: '" . addslashes($tooltip['text']) ."' , container: 'body', html: true, placement: 'auto', trigger: 'hover' });\n";
        }
    }
    print "</script>\n";
}

function printDivider(){
    print '<div class="split-pane-divider" id="divider"></div>';
    print "\n";
}