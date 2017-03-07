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


$(document).ready(function(){
    
    createUserApiUrl = apiBase + '/api/user/new';
    
    // Cancel button
    
    $('#cancelAddUserButton').on('click', function() {
        $('#addUserForm').collapse('hide'); 
        $('#password1').val(''); 
        $('#password2').val(''); 
    });

     // Form submission
    bindFormSubmissionEventHandler();
    
    
});

function bindFormSubmissionEventHandler()
{
    $('#theAddUserForm').validator().on('submit', function (event) {
        if (event.isDefaultPrevented()) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        $.post(createUserApiUrl, 
            $('#theAddUserForm').serialize(),
            function (data, text, jqXHR){
                reportSuccess('User created, page will be refreshed...', 
                $("#addUserFormDiv"), true);

            })
            .fail( function(jqXHR, text, e) { 
                reportError(jqXHR, text, e, $("#addUserFormDiv"));
            });
    });
}
