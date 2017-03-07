/*
 * Copyright (C) 2017 Universität zu Köln
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

/**
 * Some utility functions
 */

/**
 * Appends an error alert to theDiv according to the error received.
 * 
 * This function is meant to be used within the error callback of an
 * AJAX call.
 *  
 * @param {jqXHR} jqXHR
 * @param {string} text
 * @param {string} e
 * @param {element} theDiv
 * @returns {nothing}
 */
function reportError(jqXHR, text, e, theDiv)
{
    var errorMsg;
    switch(text) {
        case 'timeout':
            errorMsg = 'The server took too much time to respond, please try later';
            break;
        
        case 'parsererror':
            errorMsg = 'Parser error, please report this to the system administrator';
            break;
            
        case 'abort':
            errorMsg = 'Aborted, if not expected please report to the system administrator';
            break;

        case 'error':
            errorMsg = 'Server responded (' + jqXHR.status + ') ' + e;
            break;
            
        default:
            errorMsg = 'Unknown error, please report this to the system administrator!';

    }
    
    theDiv.append(`
        <div class="alert alert-danger alert-dismissable withtopmargin" role="alert">
            <button type="button" class="close" data-dismiss="alert" 
                    aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
           <strong>Oops, something went wrong</strong>: ` + 
            errorMsg + '</div>');
    
}

/**
 * Appends a success alert with the given message to theDiv.
 * Optionally, reloads the current page after a short delay.
 * 
 * @param {string} msg
 * @param {element} theDiv
 * @param {boolean} withReload
 * @returns {nothing}
 */
function reportSuccess(msg, theDiv, withReload)
{
    theDiv.append(`
        <div class="alert alert-success alert-dismissable" role="alert" 
                style="margin-top: 20px">
            <button type="button" class="close" data-dismiss="alert" 
                    aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
           <strong>Success! </strong>` + 
            msg + '</div>');
            
    if (withReload) {
        $(":input").attr("disabled","disabled");
        window.setTimeout(function(){location.reload();}, 1500);
    }
}


function getUserIdFromLongTermCookie()
{
    $rmeCookie = getCookie('rme');
    return $rmeCookie.split(':').pop();
}

/**
 * Gets a cookie value
 * (from http://stackoverflow.com/questions/10730362/get-cookie-by-name
 * @param {string} name
 * @returns {unresolved}
 */
function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length === 2) {
      return parts.pop().split(";").shift();
  }
  return false;
}