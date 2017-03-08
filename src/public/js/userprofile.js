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
var profileUserInfo;

var userUpdateApiUrl;
var userPasswordChangeApiUrl;
var makeRootApiUrl;
var userGetInfoApiUrl;

$(document).ready(function(){
    
    userUpdateApiUrl = apiBase + '/api/user/' + profileUserInfo['id'] + '/update';
    userGetInfoApiUrl = apiBase + '/api/user/' + profileUserInfo['id'] + '/info';
    userPasswordChangeApiUrl = apiBase + '/api/user/' + profileUserInfo['id'] + '/changepassword';
    makeRootApiUrl = apiBase + '/api/user/' + profileUserInfo['id'] + '/makeroot';

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
        // Check if the profile has changed
        fullname = $('#fullname').val();
        email = $('#email').val();
        if (fullname === profileUserInfo['fullname'] && 
                email === profileUserInfo['email']) {
            return false;
        }
        
        event.preventDefault();
        event.stopPropagation();
        console.log(profileUserInfo['fullname']);
        $.post(userUpdateApiUrl, 
            $('#theEditProfileForm').serialize(),
            function (data, text, jqXHR){
                getProfileInfoFromBackEnd();
                $('#editProfileForm').collapse('hide');
                reportSuccess('User profile updated', 
                $("#reportarea"), true);
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
                $('#changePasswordForm').collapse('hide');
                reportSuccess('User password updated', 
                $("#reportarea"), true);

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
                getProfileInfoFromBackEnd();
                $('#makeRootForm').collapse('hide');
                $('#makerootbutton').hide();
                reportSuccess('User given root status', 
                $("#reportarea"), true);

            })
            .fail( function(jqXHR, text, e) { 
                reportError(jqXHR, text, e, $("#makeRootFormDiv"));
            });
    });
    

});

       
function userProfileHtml(userInfo)
{
    str = '<img src="https://www.gravatar.com/avatar/' + userInfo['emailhash'] + '?d=mm&s=200">';
    str += '<h1>' + userInfo['fullname'] + '</h1>';
    str += '<p>Username: ' + userInfo['username'] + '</p>';
    str += '<p>Email address: ';
    if (userInfo['email']) {
        str += '<a href="mailto:' + userInfo['email'] + '">' +userInfo['email'] + '</a></p>';
    }
    
    if (userInfo['isroot']) {
        str += '<span class="label label-success">root</span>';
    }
    return str;
}


function getProfileInfoFromBackEnd() 
{
    $.getJSON(userGetInfoApiUrl, 
            function (resp){
                profileUserInfo = resp;
                $("#userprofile").html(userProfileHtml(profileUserInfo));
            });
    
}