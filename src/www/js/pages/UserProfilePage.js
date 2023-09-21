/* 
 *  Copyright (C) 2019-2022 Universität zu Köln
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


import { CollapsePanel } from '../widgets/CollapsePanel'
import { UserDocDataCommon } from './common/UserDocDataCommon'
import { setBaseUrl } from './common/SiteUrlGen'
import { MetadataEditor } from "./MetadataEditor"

export class UserProfilePage {
  
  constructor(profileUserInfo, urlGenerator) {
    this.profileUserInfo = profileUserInfo
    this.pathFor = urlGenerator
    this.userId = profileUserInfo['id']
    setBaseUrl(this.pathFor.getBaseUrl())

    this.infoArea = $('#new-info-area')

    this.infoArea.html(this.genInfoSectionHtml())
    this.mcEditionsCollapse = this.constructCollapse('#multi-chunk-editions', 'Multi-Chunk Editions', [ 'first'])
    this.chunkEditionsCollapse = this.constructCollapse('#chunk-editions', 'Chunk Editions')
    this.collationTablesCollapse = this.constructCollapse('#collation-tables', 'Collation Tables')
    this.transcriptionsCollapse = this.constructCollapse('#transcriptions', 'Transcriptions')

    this.fetchMultiChunkEditions()
    this.fetchCollationTablesAndEditions()
    this.fetchTranscriptions()

    let thisObject = this
    
    let userId = profileUserInfo['id']

    // Make Metadata Editor
    let metadata = getMetadata(thisObject.profileUserInfo)
    let metadataSchema = getMetadataSchema()

    let mde = new MetadataEditor({
      containerSelector: 'editProfileForm',
      entityId: this.userId,
      entityType: 'user',
      metadata: metadata,
      metadataSchema: metadataSchema,
      callback: (d) => {console.log(d)},
      mode: 'edit',
      theme: 'vertical'
    })

    function getMetadata(userinfo) {
      return [userinfo.fullname, userinfo.username, userinfo.email, '1992-01-21', 1802, '900-1000', '']
    }

    function getMetadataSchema() {
      return {attributes: ['Full Name', 'Username', 'E-Mail Address', 'Exact Date', 'Year', 'Years (Range)', 'Password'], types: ['text', 'text', 'email', 'date', 'year', 'years_range', 'password']}
    }

      // Pseudo-accordion behaviour
    $('#editProfileForm').on('show.bs.collapse', function () {
      $('#changePasswordForm').collapse('hide')
      $('#makeRootForm').collapse('hide')
    })
    $('#changePasswordForm').on('show.bs.collapse', function () {
      $('#editProfileForm').collapse('hide')
      $('#makeRootForm').collapse('hide')
    })

    $('#makeRootForm').on('show.bs.collapse', function () {
      $('#editProfileForm').collapse('hide')
      $('#changePasswordForm').collapse('hide')
    })

    // Cancel buttons

    $('#cancelChangePasswordButton').on('click', function () {
      $('#changePasswordForm').collapse('hide')
      $('#password1').val('')
      $('#password2').val('')
    })

    $('#cancelMakeRootButton').on('click', function () {
      $('#makeRootForm').collapse('hide')
      $('#confirmroot').prop('checked', false)
    })
    
    // Form submission

    $('#theEditProfileForm').validator().on('submit', function (event) {
      if (event.isDefaultPrevented()) {
        return false
      }
      // Check if the profile has changed
      let fullname = $('#fullname').val()
      let email = $('#email').val()
      if (fullname === profileUserInfo['fullname'] &&
                  email === profileUserInfo['email']) {
        return false
      }

      event.preventDefault()
      event.stopPropagation()
      console.log(profileUserInfo['fullname'])
      $.post(
        thisObject.pathFor.apiUpdateProfile(userId),
        $('#theEditProfileForm').serialize(),
        function (data, text, jqXHR) {
          thisObject.fetchProfileInfo(userId)
          $('#editProfileForm').collapse('hide')
          ApmUtil.reportSuccess('User profile updated', $('#reportarea'), true)
        })
      .fail(function (jqXHR, text, e) {
        ApmUtil.reportError(jqXHR, text, e, $('#editProfileFormDiv'))
      })
    })

    $('#theChangePasswordForm').validator().on('submit', function (event) {
      if (event.isDefaultPrevented()) {
        return false
      }
      event.preventDefault()
      event.stopPropagation()
      $.post(
        thisObject.pathFor.apiUserPasswordChange(userId),
        $('#theChangePasswordForm').serialize(),
        function () {
          $('#changePasswordForm').collapse('hide')
          ApmUtil.reportSuccess('User password updated', $('#reportarea'), true)
        })
      .fail(function (jqXHR, text, e) {
        ApmUtil.reportError(jqXHR, text, e, $('#changePasswordFormDiv'))
      })
    })

    $('#theMakeRootForm').validator().on('submit', function (event) {
      if (event.isDefaultPrevented()) {
        return false
      }
      event.preventDefault()
      event.stopPropagation()
      
      $.post(
        thisObject.pathFor.apiUserMakeRoot(userId),
        $('#theMakeRootForm').serialize(),
        function () {
          thisObject.fetchProfileInfo(userId)
          $('#makeRootForm').collapse('hide')
          $('#makerootbutton').hide()
          ApmUtil.reportSuccess('User given root status', $('#reportarea'), true)
        })
      .fail(function (jqXHR, text, e) {
        ApmUtil.reportError(jqXHR, text, e, $('#makeRootFormDiv'))
      })
    })
  }

  constructCollapse(selector, title, headerClasses = []) {
    return new CollapsePanel({
      containerSelector: selector,
      title: title,
      content: this.genLoadingMessageHtml(),
      contentClasses: [ 'info-section-content'],
      headerClasses: headerClasses,
      iconWhenHidden: '<small><i class="bi bi-caret-right-fill"></i></small>',
      iconWhenShown: '<small><i class="bi bi-caret-down-fill"></i></small>',
      iconAtEnd: true,
      headerElement: 'h1',
      initiallyShown: true,
      debug: false
    })
  }

  fetchMultiChunkEditions() {
    $.get(this.pathFor.apiUserGetMultiChunkEditionInfo(this.userId)).then( (data) => {
      this.mcEditionsCollapse.setContent(UserDocDataCommon.generateMultiChunkEditionsListHtml(data))
    })
  }


  fetchTranscriptions() {
    $.get(this.pathFor.apiTranscriptionsByUserDocPageData(this.userId)).then( (data) => {
      this.transcriptionsCollapse.setContent(UserDocDataCommon.generateTranscriptionListHtml(data))
    })
  }

  fetchCollationTablesAndEditions() {
    $.get(this.pathFor.apiUserGetCollationTableInfo(this.userId)).then( (data) => {
      let listHtml = UserDocDataCommon.generateCtTablesAndEditionsListHtml(data['tableInfo'], data['workInfo'])
      this.chunkEditionsCollapse.setContent(listHtml.editions)
      this.collationTablesCollapse.setContent(listHtml.cTables)
    })
  }

  genLoadingMessageHtml() {
    return `Loading data  <span class="spinner-border spinner-border-sm" role="status"></span>`
  }
  
  genUserProfileHtml (userInfo) {
    let str = '<img src="https://www.gravatar.com/avatar/' + userInfo['emailhash'] + '?d=mm&s=200" alt="User Gravatar">'
    str += '<h1>' + userInfo['fullname'] + '</h1>'
    str += '<p>Username: ' + userInfo['username'] + '</p>'
    str += '<p>Email address: '
    if (userInfo['email']) {
      str += '<a href="mailto:' + userInfo['email'] + '">' + userInfo['email'] + '</a></p>'
    }

    if (userInfo['isroot']) {
      str += '<span class="label label-success">root</span>'
    }
    return str
  }

  fetchProfileInfo (id) {
    let thisObject = this
    $.getJSON(
      thisObject.pathFor.apiUserGetInfo(id),
      function (resp) {
        thisObject.profileUserInfo = resp
        $('#userprofile').html(thisObject.genUserProfileHtml(thisObject.profileUserInfo))
      }
    )
  }

  genInfoSectionHtml() {
    return `<div id="multi-chunk-editions" class="info-section"></div>
        <div id="chunk-editions" class="info-section"></div>
        <div id="collation-tables" class="info-section"></div>
        <div id="transcriptions" class="info-section"></div>
        <div id="admin" class="info-section"></div>
`
  }
  
}


// make global
window.UserProfilePage = UserProfilePage

