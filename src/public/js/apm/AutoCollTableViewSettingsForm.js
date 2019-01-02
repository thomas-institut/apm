/*
 * Copyright (C) 2016-18 Universität zu Köln
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

/*
 * Mini-app to show and process a form where the user can
 * choose and arrange a list of witnesses to include in an automatic
 * collation table.
 */


/* global Twig */

class AutomaticCollationTableViewSettingsForm {
  
  constructor(containerSelector) {
    this.cancelEventName = 'cancel'
    this.applyEventName = 'apply'
   
    this.initialOptions = {}

    this.containerSelector = containerSelector
    
    this.container = $(this.containerSelector)
    this.container.addClass('hidden')
    this.container.html(this.getFormTemplate().render())
    
    this.cancelButton = $(this.containerSelector + ' .cancel-btn')
    this.applyButton = $(this.containerSelector + ' .apply-btn')
    this.highlightVariantsCheckBox = $(this.containerSelector + ' .highlightvariants-cb')
    this.multipleRowsCheckBox = $(this.containerSelector + ' .multiplerows-cb')
    this.columnsPerRowInput =  $(this.containerSelector + ' .columnsperrow') 
    
    
    this.cancelButton.on('click', this.genOnClickCancelButton())
    this.applyButton.on('click', this.genOnClickApplyButton())
  }
  
  show(options) {
    // NOTE: make the container visible before calling setOptions!
    this.container.removeClass('hidden')
    this.setOptions(options)
  }
  
  hide() {
    this.container.addClass('hidden')
  }
  
  isHidden() {
    return this.container.hasClass('hidden')
  }
  
  setOptions(options) {
    this.initialOptions = options
    this.highlightVariantsCheckBox.prop('checked', options.highlightVariants)
    this.multipleRowsCheckBox.prop('checked', options.multipleRows)
    this.columnsPerRowInput.val(options.maxColumnsPerTable)
  }
  
  getOptions() {
    let options = {}
    options.highlightVariants = this.highlightVariantsCheckBox.is(':checked')
    options.multipleRows =  this.multipleRowsCheckBox.is(':checked')
    options.maxColumnsPerTable = parseInt(this.columnsPerRowInput.val())
    return options
  }

  dispatchEvent(eventName, data = {})
  {
    const event = new CustomEvent(eventName, {detail: data})
    this.container.get()[0].dispatchEvent(event)
  }
  
  /**
   * Attaches a callback function to an editor event
   * 
   * @param {String} eventName
   * @param {function} f
   */
  on(eventName, f) 
  {
    this.container.on(eventName, f)
  }
  
  genOnClickCancelButton() {
    let thisObject = this
    return function() {
      thisObject.dispatchEvent(thisObject.cancelEventName)
    }
  }
  
  genOnClickApplyButton() {
    let thisObject = this
    return function() {
      thisObject.dispatchEvent(thisObject.applyEventName, thisObject.getOptions())
    }
  }
  
  //----------------------------------------------------------------
  // Form Template
  //----------------------------------------------------------------
  
  getFormTemplate() {
    return Twig.twig({
       id: 'autocolltableviewsettingsform',
      data: `
      <h3>View Settings</h3>
        <form>
          <div class="checkbox">
            <label>
              <input type="checkbox" class="highlightvariants-cb">Highlight Variants
            </label>
          </div>
          <div class="checkbox">
            <label>
              <input type="checkbox" class="multiplerows-cb">Show in multiple rows
            </label>
          </div>
          <div class="form-group">
            <input type="number" class="columnsperrow"> 
            <label for="columnsperrow">columns per row</label>
          </div>
          <button type="button" class="btn btn-primary btn-sm apply-btn">
            Apply
          </button>
          <button type="button" class="btn btn-default btn-sm cancel-btn">
              Cancel
          </button>
      </form>
      <div class="warningdiv"></div>
`
    })
  }
}