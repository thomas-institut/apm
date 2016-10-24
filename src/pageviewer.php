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
        <title>Manuscript Viewer</title>
        <link rel="stylesheet" type="text/css" media="screen" href="normalize.css" />
        <link rel="stylesheet" type="text/css" media="screen" href="styles.css" />
        <link rel="stylesheet" type="text/css" media="screen" href="pageviewer.css" />
        <link rel="stylesheet" type="text/css" media="screen" href="jquery-ui.css" />
        <script type="application/javascript" src="jquery-3.1.1.js"></script>
        <script type="application/javascript" src="jquery-ui.js"></script>
        <script type="application/javascript" src="openseadragon.min.js"></script>
        <script type="application/javascript" src="pageviewer.js"></script>
    </head>
    <body>
        <div id="viewerheader">
            <h2 class="header"><?php print "$mss - Page $page"?></h2>
        </div>
        
        <div id="navigation">
            <ul class="pv-navbar"> 
                <!--                <li style="float: left;">
                                    <button title="Vertically">
                                        <img src="images/stack_vertically.png" alt="Vertically">
                                    </button>
                                </li>
                                <li style="float: left;">
                                    <button title="Horizontally">
                                        <img src="images/stack_horizontally.png" alt="Horizontally">
                                    </button>
                                </li>-->
                <li style="float: left;">
                    <button title="Previous Page: <?php print $prevPage; ?>" 
                            onclick="window.location='pageviewer.php?doc=<?php print $mss; ?>&page=<?php print $prevPage; ?>';" <?php print $prevButtonDisabled ?>>
                        <img src="images/left-arrow-1.png" height="30px" alt="Previous">
                    </button>
                </li>
                <li style="float: left;">
                    <button title="Next Page: <?php print $nextPage; ?>" 
                            onclick="window.location='pageviewer.php?doc=<?php print $mss; ?>&page=<?php print $nextPage; ?>';" <?php print $nextButtonDisabled ?>>
                        <img src="images/right-arrow-1.png" height="30px" alt="Next">
                    </button>
                </li>
                <li style="float: left;">
                    <button title="Exit Viewer" 
                            onclick="window.location='index.php';">
                        <img src="images/exit-1.png" height="30px" alt="Exit">
                    </button>
                </li>
            </ul>
        </div>
            <div id="container">
<?php
// The idea is to change the order of the 
// image and text containers depending on the
// direction of the text, but I still need to
// play with CSS to do that. For the time
// being this doesn't do anything really
if ($db->isPageRightToLeft($mss, $page)){
    printImageContainer();
    printDivider();
    printPageTextContainer();
}
else{
    printPageTextContainer();
    printDivider();
    printImageContainer();
}
?>
        </div>
    </body>
</html>        
<?php

function printImageContainer(){
    global $db, $mss, $page;
?>
            <div id="pageimage">
            </div>
            
            <script type="text/javascript">
                var viewer = OpenSeadragon({
                    id: "pageimage",
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
    
    print "<div id=\"pagetext\">\n";
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
//                    if ($item->isRtl()){
//                        $theText = $theText .  "&rlm;";
//                    }
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
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '">' . $t . '</span>';
                    $richTooltips[$htmlId]['type'] = 'sic';
                    $richTooltips[$htmlId]['text'] =  'sic<br/>Original: ' . $item->theText . '<br/>Correction: ' . $item->getCorrection();
                    break;
                    
                case TranscriptionTextItem::ABBREVIATION:
                    $classes = $classes . ' abbr';
                    $t = $item->getExpansion();
                    if ($t === ''){
                        $t = $item->theText;
                    }
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '">' . $t . '</span>';
                    $richTooltips[$htmlId]['type'] = 'sic';
                    $richTooltips[$htmlId]['text'] =  'sic<br/>Original: ' . $item->theText . '<br/>Expansion: ' . $item->getExpansion();
                    break;
                
                case TranscriptionTextItem::MARK:
                    $classes = $classes . ' mark';
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '">' . '[N]' . '</span>';
                    break;
                
                case TranscriptionTextItem::UNCLEAR:
                    $classes = $classes . ' unclear';
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '">' . $item->getText() . '</span>';
                    $richTooltips[$htmlId]['type'] = 'unclear';
                    $ttt = 'Unclear<br/>';
                    if ($item->altText !== ''){
                        $ttt = $ttt . 'Alternative: ' . $item->altText . '<br/>';
                    }
                    $ttt = $ttt . 'Reason: ' . $item->getReason();
                    $richTooltips[$htmlId]['text'] =  $ttt;
                    break;
                    
                case TranscriptionTextItem::ILLEGIBLE:
                    $classes = $classes . ' illegible';
                    $theText = $theText . '<span class="'. $classes .  '" id="' . $htmlId . '">' . $item->getText() . '</span>';
                    $richTooltips[$htmlId]['type'] = 'illegible';
                    $ttt = 'Illegible<br/>';
                    if ($item->getReason() !== 'illegible'){
                        $ttt = $ttt . 'Reason: ' . $item->getReason() . '<br/>';
                    }
                    $ttt = $ttt . 'Length: ' . $item->getLength();
                    $richTooltips[$htmlId]['text'] =  $ttt;
                    break;
                    
                    
                
                default:
                    $theText = $theText . $item->getText();
            }
            
            if ($ednotes !== NULL){
                if (!isset($richTooltips[$htmlId])){
                    $richTooltips[$htmlId]['type'] = 'ednote';
                    $richTooltips[$htmlId]['text'] = '';
                }
                $t = '<h5>Notes</h5><ol>';
                foreach ($ednotes as $en){
                    $t = $t . '<li>';
                    $t = $t . '<p>' . $db->getUsernameById($en->authorId) . ' @ ' . $en->time . '</p>';
                    $t = $t . '<p>' . $en->text . '</p>';
                    $t = $t . '</li>';
                    
                }
                $t = $t . '</ol>';
                $richTooltips[$htmlId]['text'] = $richTooltips[$htmlId]['text'] . $t;
            }
        }
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
    
    print "<script>$(\"#pagetext\").tooltip();</script>\n";
    print "<script>\n";
    foreach($richTooltips as $id => $tooltip){
        print "$(\"#" . $id . "\").tooltip({content: \"" . $tooltip['text'] ."\", items: \"span\"});\n";
                
    }
    print "</script>\n";
            

}

function printDivider(){
    print '<div id="divider"></div>';
}
