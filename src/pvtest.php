<?php

/* 
 * Copyright (C) 2016 rafael
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

?>
<html>
<head>
<style>
    html {
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        padding: 0;
        margin: 0;
    }
    
    
    body{
        padding: 0;
        margin: 0;
    }
    
    #header {
        padding-left: 10px;
    }
    
    #container {
                position: absolute;
                width: 100%;
                top: 111px;
                bottom: 0;
                background-color: #f1f1f1;
                border-top: 1px solid silver;
            }
            
            #pageimage{
                position: absolute;
                left: 10px;
                top: 10px;
                width: 1%;
                height: 770px;
                background-color: white;
                border: 1px solid silver;
            }
            
            #pagetext {
                position: absolute;
                right: 10px;
                top: 10px;
                width: 1%;
                border: 1px solid silver;
                height: 770px;
                background-color: white;
                overflow-x:auto;
            }
            
            #divider{
                position: absolute;
                top: 10px;
                width: 10px;
                /* background-color: lightblue;*/
                cursor: pointer;
                
            }
    
</style>
<script type="application/javascript" src="jquery-3.1.1.js"></script>
<script>

// Holds the current position of the container
// divider as a fraction of the document's width
var currentPosX = 0.5;
var resizing = false;

function resizeContainers(posX){
    currentPosX = posX;
    win = $(window);
    absCurrentPosX = win.width()*currentPosX;
            
    leftContentWidth = absCurrentPosX - 17;
    rightContentWidth = win.width() - absCurrentPosX - 17;
    headerHeight = $('#header').height()+10;
    contentHeight = win.height() - headerHeight - 22;
    $('#container').css('top', headerHeight + 'px');
    $('#pageimage').width(leftContentWidth).height(contentHeight);
    $('#pagetext').width(rightContentWidth).height(contentHeight);
    $('#divider').css('left', leftContentWidth+12).height(contentHeight+2);
}
 
function strPrintSizes() {
    doc = $(document);
    win = $(window);
    return 'Doc: ' + doc.width() + 'x' + doc.height() + '  Win: '  
      + win.width() + 'x' + win.height();
}
$(document).ready(function(){
    
    resizing = false;
    divider = $('#divider');
    
    divider.on('mousedown', function(event){
        resizing = true;
        $('#divider').css('cursor', 'col-resize');
        resizeContainers(event.pageX/$(window).width());
        //console.log('Divider mousedown');
    });
    divider.on('mouseup', function(){
        $('#divider').css('cursor', 'pointer');
        //console.log('Divider mouseup');
        if (resizing){
            resizeContainers(event.pageX/$(window).width()); 
            resizing = false;
        }
        
    });
    divider.on('mousemove', function (event){
       // console.log('Divider mousemove');
       if (resizing) {
          $('#divider').css('cursor', 'col-resize');
          resizeContainers(event.pageX/$(window).width()); 
       } 
       else {
            $('#divider').css('cursor', 'pointer');
       }
    });
    divider.on('mouseout', function(event){
        //console.log('Divider mouseout');
        if (resizing){
            resizing = false;
            resizeContainers(event.pageX/$(window).width()); 
            $('#divider').css('cursor', 'pointer');
        }
    });
    
    $(window).resize(function(){
       //console.log('Window resize, before... ' + strPrintSizes());
       $(document).height($(window).height());
       $(document).width($(window).width());
       resizeContainers(currentPosX);
       //console.log('Window resize, after... ' + strPrintSizes());
    });
});

$(window).on('load', function() {
    console.log('Ready...' + strPrintSizes());
    $(document).height($(window).height());
    $(document).width($(window).width());
    console.log('Ready...' + strPrintSizes());
    resizeContainers(0.5);
});

</script>
</head>    
<body>
    <div id="header">
    <h1>Page Viewer Test</h1>
    </div>
    <div id="container">
        <div id="pageimage">
            <p>This the left content.</p>
            
        </div>
        <div id="divider">
            
        </div>
        <div id="pagetext">
            <p>This is the right content.</p>
        </div>
        
    </div>
</body>
</html>