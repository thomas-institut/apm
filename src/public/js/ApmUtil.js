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

class ApmUtil {

  /**
   * Appends an error alert to theDiv according to the error received.
   *
   * This function is meant to be used within the error callback of an
   * AJAX call.
   *
   * @param {jqXHR} jqXHR  jquery XHR object
   * @param {string} text error test
   * @param {string} e event
   * @param {element} theDiv  the Div
   * @returns {nothing} nothing
   */
  static reportError (jqXHR, text, e, theDiv) {
    let errorMsg = ''
    switch (text) {
      case 'timeout':
        errorMsg = 'The server took too much time to respond, please try later'
        break

      case 'parsererror':
        errorMsg = 'Parser error, please report this to the system administrator'
        break

      case 'abort':
        errorMsg = 'Aborted, if not expected please report to the system administrator'
        break

      case 'error':
        errorMsg = 'Server responded (' + jqXHR.status + ') ' + e
        break

      default:
        errorMsg = 'Unknown error, please report this to the system administrator!'
    }

    theDiv.append(`
          <div class="alert alert-danger alert-dismissable withtopmargin" role="alert">
              <button type="button" class="close" data-dismiss="alert" 
                      aria-label="Close">
                  <span aria-hidden="true">&times;</span>
              </button>
             <strong>Oops, something went wrong</strong>: ` +
              errorMsg + '</div>')
  }

  /**
   * Appends a success alert with the given message to theDiv.
   * Optionally, reloads the current page after a short delay.
   *
   * @param {string} msg  Sucess message
   * @param {element} theDiv  div object
   * @param {boolean} fadeOut to fade or not to fade
   * @returns {nothing} nothing
   */
  static reportSuccess (msg, theDiv, fadeOut = false) {
    const id = theDiv.attr('id') + '-successalert' + ApmUtil.someNum
    ApmUtil.someNum++
    const html = '<div class="alert alert-success alert-dismissable" id="' +
              id + `" role="alert" 
                  style="margin-top: 20px">
              <button type="button" class="close" data-dismiss="alert" 
                      aria-label="Close">
                  <span aria-hidden="true">&times;</span>
              </button>
             <strong>Success! </strong>` +
              msg + '</div>'

    theDiv.append(html)
    if (fadeOut) {
      $('#' + id).fadeOut(2500)
    }
  }

  static getUserIdFromLongTermCookie () {
    const rmeCookie = ApmUtil.getCookie('rme')
    return rmeCookie.split(':').pop()
  }

  /**
   * Gets a cookie value
   * (from http://stackoverflow.com/questions/10730362/get-cookie-by-name
   * @param {string} name  Cookie name
   * @returns {Cookie|boolean}  a cookie or false
   */
  static getCookie (name) {
    const value = '; ' + document.cookie
    const parts = value.split('; ' + name + '=')
    if (parts.length === 2) {
      return parts.pop().split(';').shift()
    }
    return false
  }
  
  static setPageTypeSelectOptions(selector, pageTypeNames, pageType = 0) {
    let optionsType = ''
    for (const type of pageTypeNames) {
      optionsType += '<option value="' + type.id + '"'
      if (pageType === parseInt(type.id)) {
        optionsType += ' selected'
      }
      optionsType += '>' + type.descr + '</option>'
    }
    $(selector).html(optionsType)
  }
  
  static getLangDefFromLanguagesArray(langArray) {
    let langDef = {}
    for (const lang of langArray) {
      langDef[lang['code']] = lang
    }
    return langDef
  }
}

ApmUtil.someNum = 1
