/*
 *  Copyright (C) 2020 Universität zu Köln
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

// TODO: make this completely independent of external css styles

const idPrefix = 'transient-alert-'
const normalFadeClass = 'fade'
const slowFadeClass = 'slow-fade'


export function transientAlert(container, title, msg, timeOn = 2000, fadeSpeed = 'normal') {
  let randomId = getRandomHtmlId(idPrefix)
  let fadeClass = normalFadeClass
  let fadeWaitTime = 200
  if (fadeSpeed === 'slow') {
    fadeClass = slowFadeClass
    fadeWaitTime = 550
  }
  container.html(getAlertHtml(title, msg, randomId))
  let alertElement = $('#' + randomId)
  alertElement.addClass('opacity-1').addClass(fadeClass)
  window.setTimeout(function() {
    alertElement.removeClass('opacity-1').addClass('opacity-0')
    window.setTimeout(function() {
      container.html('')
    }, fadeWaitTime)
  }, timeOn)
}


function getAlertHtml(title, msg, id) {
  let html=''
  html+= '<span id="' + id  + '" class="text-warning" role="alert">'
  html += '<strong>' + title + '</strong> '
  html +=  msg
  html += '</div>'
  return html
}


function getRandomHtmlId(prefix, numDigits = 6) {
  return prefix + Math.floor( Math.pow(10, numDigits-1) * Math.random() )
}
