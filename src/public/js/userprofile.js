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
    userPasswordChangeApiUrl = apiBase + '/api/user/' + profileUserId + '/changepassword';
    makeRootApiUrl = apiBase + '/api/user/' + profileUserId + '/makeroot';
    
    // Pseudo-accordion behaviour
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
    
    // Cancel buttons
    
    $('#cancelChangePasswordButton').on('click', function() {
        $('#changePasswordForm').collapse('hide'); 
        $('#password1').val(''); 
        $('#password2').val(''); 
    });
    
    $('#cancelMakeRootButton').on('click', function() {
        $('#makeRootForm').collapse('hide');
        $('#confirmroot').prop('checked', false);
    });
    
    // Form submission
    
    $('#theEditProfileForm').validator().on('submit', function (event) {
        if (event.isDefaultPrevented()) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        $.post(userUpdateApiUrl, 
            $('#theEditProfileForm').serialize(),
            function (data, text, jqXHR){
                reportSuccess('User profile updated, page will be refreshed...', 
                $("#editProfileFormDiv"), true);

            })
            .fail( function(jqXHR, text, e) { 
                reportError(jqXHR, text, e, $("#editProfileFormDiv"));
            });
    });
    
    $('#theChangePasswordForm').validator().on('submit', function (event) {
        if (event.isDefaultPrevented()) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        $.post(userPasswordChangeApiUrl, 
            $('#theChangePasswordForm').serialize(),
            function (data, text, jqXHR){
                reportSuccess('User password updated, page will be refreshed...', 
                $("#changePasswordFormDiv"), true);

            })
            .fail( function(jqXHR, text, e) { 
                reportError(jqXHR, text, e, $("#changePasswordFormDiv"));
            });
    });
    
    $('#theMakeRootForm').validator().on('submit', function (event) {
        if (event.isDefaultPrevented()) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        $.post(makeRootApiUrl, 
            $('#theMakeRootForm').serialize(),
            function (data, text, jqXHR){
                reportSuccess('User given root status, page will be refreshed...', 
                $("#makeRootFormDiv"), true);

            })
            .fail( function(jqXHR, text, e) { 
                reportError(jqXHR, text, e, $("#makeRootFormDiv"));
            });
    });
    

});
