/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

/* eslint-env jquery */

/* global ApmUtil */

class UserManagerPage {
  
  constructor(options) {
    this.pathFor = options.urlGenerator
    // Cancel button
    $('#cancelAddUserButton').on('click', function () {
      $('#addUserForm').collapse('hide')
      $('#password1').val('')
      $('#password2').val('')
    })

    $("#usertable").DataTable({ 'paging': false, 'searching' : true });
    $('#theAddUserForm').validator().on('submit', this.genFormSubmitHandler())
  }
  
  genFormSubmitHandler () {
    let pathFor = this.pathFor
    return function (event) {
      if (event.isDefaultPrevented()) {
        return false
      }
      event.preventDefault()
      event.stopPropagation()
      let newUsername = $('#username').val()
      $.post(
        pathFor.apiCreateUser(),
        $('#theAddUserForm').serialize())
      .done(function (data, text, jqXHR) {
        $('#addUserForm').collapse('hide')
        ApmUtil.reportSuccess('User ' + newUsername + ' created',
           $('#reportarea'), true)
        window.setTimeout(function () { location.reload() }, 2500)
      })
      .fail(function (jqXHR, text, e) {
        ApmUtil.reportError(jqXHR, text, e, $('#addUserFormDiv'))
      })
    }
  }
}

