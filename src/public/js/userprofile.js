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

var apiBase;
var profileUserId;

$(document).ready(function(){
    
    userUpdateApiUrl = apiBase + '/api/user/' + profileUserId + '/update';
    
    $('#editProfileForm').on('show.bs.collapse', function () {
        $('#changePasswordForm').collapse('hide');
        $('#makeRootForm').collapse('hide');
    });
    $('#changePasswordForm').on('show.bs.collapse', function () {
        $('#editProfileForm').collapse('hide');
        $('#makeRootForm').collapse('hide');
    });
    
    $('#makeRootForm').on('show.bs.collapse', function () {
        $('#editProfileForm').collapse('hide');
        $('#changePasswordForm').collapse('hide');
    });
    
    $('#theEditProfileForm').on('submit', function (event) {
        event.preventDefault();
        console.log($('#theEditProfileForm').serialize());
        $.post(userUpdateApiUrl, 
            $('#theEditProfileForm').serialize(),
            function (data, text, jqXHR){
                reportSuccess('User profile updated, page will be refreshed...', $("#editProfileFormDiv"), true);

            })
            .fail( function(jqXHR, text, e) { 
                reportError(jqXHR, text, e, $("#editProfileFormDiv"));
            });
        });    
});

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
        <div class="alert alert-danger alert-dismissable" role="alert" 
                style="margin-top: 20px">
            <button type="button" class="close" data-dismiss="alert" 
                    aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
           <strong>Oops, something went wrong</strong>:` + 
            errorMsg + '</div>');
    
}

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

