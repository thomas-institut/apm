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

/* eslint-env jquery */

/* global ApmUtil */

class UserManager {
  
  constructor(options) {
    this.pathFor = options.urlGenerator
    // Cancel button
    $('#cancelAddUserButton').on('click', function () {
      $('#addUserForm').collapse('hide')
      $('#password1').val('')
      $('#password2').val('')
    })

    $("#usertable").DataTable({ 'paging': false, 'searching' : false });
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

