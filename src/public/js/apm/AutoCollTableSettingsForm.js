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

class AutomaticCollationTableSettingsForm {
  
  constructor(containerSelector) {
    this.cancelEventName = 'cancel'
    this.applyEventName = 'apply'
    this.dragElementClass = 'dragElem'
    this.overClass = 'over'
    this.overBoxClass = 'overBox'
    this.witnessDraggableClass = 'wdraggable'
    
    this.notEnoughWitnessesWarningHtml = '<p class="text-danger">' + 
            '<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>' + 
            ' Please select 2 or more witnesses to include in the collation table</p>'
    
    this.witnessList = []
    this.initialOptions = {}

    this.containerSelector = containerSelector
    
    // Data for drag and drop
    this.dragSourceElement = null
    this.dragSourceParent = null 
    
    this.container = $(this.containerSelector)
    this.container.addClass('hidden')
    this.container.html(this.getFormTemplate().render())
    
    this.cancelButton = $(this.containerSelector + ' .cancel-btn')
    this.applyButton = $(this.containerSelector + ' .apply-btn')
    this.allButton = $(this.containerSelector + ' .all-btn')
    this.noneButton = $(this.containerSelector + ' .none-btn')
    this.ignorePunctuationCheckbox = $(this.containerSelector + ' .ignorepunct-cb')
    this.witnessesAvailableSelectBox = $(this.containerSelector + ' .witnessesavailable-box')
    this.witnessesToIncludeBox = $(this.containerSelector + ' .witnessestoinclude-box')
    this.warningDiv = $(this.containerSelector + ' .warningdiv')
    
    this.cancelButton.on('click', this.genOnClickCancelButton())
    this.applyButton.on('click', this.genOnClickApplyButton())
    this.allButton.on('click', this.genOnClickAllButton())
    this.noneButton.on('click', this.genOnClickNoneButton())
  }
  
  show(availableDocs, options) {
    // NOTE: make the container visible before calling setOptions!
    this.container.removeClass('hidden')
    this.initialOptions = options
    this.setOptions(availableDocs, options)
  }
  
  hide() {
    this.container.addClass('hidden')
  }
  
  isHidden() {
    return this.container.hasClass('hidden')
  }
  
  setOptions(availableWitnesses, options, noneIncludedMeansAll = true) {
    this.initialOptions = options
    // 1. Build the witnesses master list
    this.witnessList = availableWitnesses
    for(const witness of this.witnessList) {
      witness.toInclude = false
    }
    for(const witnessToInclude of options.witnesses) {
      for (const witness of this.witnessList) {
        if (witnessToInclude.type === witness.type && witnessToInclude.id === witness.id) {
          witness.toInclude = true
        }
      }
    }
    if(noneIncludedMeansAll && options.witnesses.length === 0) {
      // This means ALL witnesses are to be included
      console.log('ALL witness are to be included')
      for(const witness of this.witnessList) {
        witness.toInclude = true
        options.witnesses.push({ type: witness.type, id: witness.id})
      }
    }
    
    // 2. Set up options
    this.ignorePunctuationCheckbox.prop('checked', options.ignorePunctuation)
    
    // 3. Set up witness boxes
    
    // 3.a. Prepare html for boxes
    let witnessesAvailableHtml = ''
    let witnessesToIncludeHtml = ''
    let witnessesToIncludeHtmlElements = []
    for(const witness of this.witnessList) {
      if (!witness.toInclude) {
        witnessesAvailableHtml += this.getWitnessDraggableHtml(witness)
      } else {
        witnessesToIncludeHtmlElements[witness.id] = this.getWitnessDraggableHtml(witness)
      }
    }
    // 3.b arrange the elements of the toInclude box in the order given in the options 
    for(const witnessToInclude of options.witnesses) {
      witnessesToIncludeHtml += witnessesToIncludeHtmlElements[witnessToInclude.id]
    }
    
    // 3.c set html in boxes
    this.witnessesAvailableSelectBox.html(witnessesAvailableHtml)
    this.witnessesToIncludeBox.html(witnessesToIncludeHtml)
    
    let witnessBoxes = document.querySelectorAll(this.containerSelector + ' .' + this.witnessDraggableClass);
    for(const elem of witnessBoxes) {
      this.addWitnessBoxDnDHandlers(elem)
    }

    this.dealWithEmptyBoxes()
    this.dealWithNotEnoughWitnessesToInclude()
  }
  
  dealWithNotEnoughWitnessesToInclude() {
    // if there are less than 2 witnesses to include
    // show a warning and disable apply button
    
    if (this.getToIncludeWitnessesCount() < 2) {
      this.applyButton.prop('disabled', true)
      this.warningDiv.html(this.notEnoughWitnessesWarningHtml)
      return false
    }
    
    this.applyButton.prop('disabled', false)
    this.warningDiv.html('')
  }
  
  dealWithEmptyBoxes() {
    if (this.getAvailableWitnessesCount() === 0) {
      // Available witness box is empty, make 
      // save the functions so that we can remove the event listeners later on
      this.onDropBoxFunctionForAvailableWitnesses = this.genOnDropBox()
      this.onDragOverFunctionForAvailableWitnesses = this.genOnDragOverBox()
      this.onDragLeaveFunctionForAvailableWitnesses = this.genOnDragLeaveBox()
      this.onDragEndFunctionForAvailableWitnesses = this.genOnDragEndBox()
      this.witnessesAvailableSelectBox.get(0).addEventListener('drop', this.onDropBoxFunctionForAvailableWitnesses, false)
      this.witnessesAvailableSelectBox.get(0).addEventListener('dragover', this.onDragOverFunctionForAvailableWitnesses, false)
      this.witnessesAvailableSelectBox.get(0).addEventListener('dragleave', this.onDragLeaveFunctionForAvailableWitnesses, false)
      this.witnessesAvailableSelectBox.get(0).addEventListener('dragend', this.onDragEndFunctionForAvailableWitnesses, false)
      // make the box bigger, so that it can actually be seen
      // NOTE: the form container must be visible for this work
      this.witnessesAvailableSelectBox.css('height', this.witnessesToIncludeBox.height() +  'px')
    } else {
      // There are items in the box, so we don't need to whole box itself 
      // to be able to receive items
      this.witnessesAvailableSelectBox.get(0).removeEventListener('drop', this.onDropBoxFunctionForAvailableWitnesses, false)
      this.witnessesAvailableSelectBox.get(0).removeEventListener('dragover', this.onDragOverFunctionForAvailableWitnesses, false)
      this.witnessesAvailableSelectBox.get(0).removeEventListener('dragleave', this.onDragLeaveFunctionForAvailableWitnesses, false)
      this.witnessesAvailableSelectBox.get(0).removeEventListener('dragend', this.onDragEndFunctionForAvailableWitnesses, false)
      this.witnessesAvailableSelectBox.css('height', 'auto')
    }
    if(this.getToIncludeWitnessesCount() === 0) {
      // save the functions so that we can remove the event listeners later on
      this.onDropBoxFunctionForToIncludeWitnesses = this.genOnDropBox()
      this.onDragOverFunctionForToIncludeWitnesses = this.genOnDragOverBox()
      this.onDragLeaveFunctionForToIncludeWitnesses = this.genOnDragLeaveBox()
      this.onDragEndFunctionForToIncludeWitnesses = this.genOnDragEndBox()
      this.witnessesToIncludeBox.get(0).addEventListener('drop', this.onDropBoxFunctionForToIncludeWitnesses, false)
      this.witnessesToIncludeBox.get(0).addEventListener('dragover', this.onDragOverFunctionForToIncludeWitnesses, false)
      this.witnessesToIncludeBox.get(0).addEventListener('dragleave', this.onDragLeaveFunctionForToIncludeWitnesses, false)
      this.witnessesToIncludeBox.get(0).addEventListener('dragend', this.onDragEndFunctionForToIncludeWitnesses, false)
      // make the box bigger, so that it can actually be seen
      // NOTE: the form container must be visible for this work
      this.witnessesToIncludeBox.css('height', this.witnessesAvailableSelectBox.height() +  'px')
    } else {
      // There are items in the box, so we don't need to whole box itself 
      // to be able to receive items
      this.witnessesToIncludeBox.get(0).removeEventListener('drop', this.onDropBoxFunctionForToIncludeWitnesses, false)
      this.witnessesToIncludeBox.get(0).removeEventListener('dragover', this.onDragOverFunctionForToIncludeWitnesses, false)
      this.witnessesToIncludeBox.get(0).removeEventListener('dragleave', this.onDragLeaveFunctionForToIncludeWitnesses, false)
      this.witnessesToIncludeBox.get(0).removeEventListener('dragend', this.onDragEndFunctionForToIncludeWitnesses, false)
      this.witnessesToIncludeBox.css('height', 'auto')
    }
  }
  
  
  getAvailableWitnessesCount() {
    let count = 0
    for(const witness of this.witnessList) {
      if (!witness.toInclude) {
        count++
      }
    }
    return count
  }
  
  getToIncludeWitnessesCount() {
    let count = 0
    for(const witness of this.witnessList) {
      if (witness.toInclude) {
        count++
      }
    }
    return count
  }
  
  updateWitnessListFromBoxes() {
    let wAvailableBoxChildren = this.witnessesAvailableSelectBox.children()
    for(const elem of wAvailableBoxChildren) {
      for(const witness of this.witnessList) {
        if (witness.type === elem.getAttribute('type') && witness.id === parseInt(elem.getAttribute('witnessid'))) {
          witness.toInclude = false
          break
        }
      }
    }
    let wToIncludeBoxChildren = this.witnessesToIncludeBox.children()
    for(const elem of wToIncludeBoxChildren) {
      for(const witness of this.witnessList) {
        if (witness.type === elem.getAttribute('type') && witness.id === parseInt(elem.getAttribute('witnessid'))) {
          witness.toInclude = true
          break
        }
      }
    }
  }
  
  getWitnessDraggableHtml(witness) {
    return '<p class="btn-default btn-sm btn-witness wdraggable" draggable="true" ' + 
            'type="' + witness.type + '" witnessid="' + witness.id + '">' + witness.title + '</p>'
  }
  
  getOptions() {
    let options = {}
    options.work = this.initialOptions.work
    options.chunk = this.initialOptions.chunk
    options.lang = this.initialOptions.lang
    options.ignorePunctuation = this.ignorePunctuationCheckbox.is(':checked')
    options.witnesses = []
    this.updateWitnessListFromBoxes()
    // Notice that the list of included witnesses can, in principle, be empty, which only means
    // that the user has not chosen any witnesses to include. In the context of calling the
    // collation API, an empty list of included witnesses means, however, that ALL witness are 
    // to be collated; it is up to the caller to handle this semantic difference.
    let wToIncludeBoxChildren = this.witnessesToIncludeBox.children()
    for(const elem of wToIncludeBoxChildren) {
      options.witnesses.push({
        type: elem.getAttribute('type'),
        id: parseInt(elem.getAttribute('witnessid'))
      })
    }
    
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
  
  genOnClickAllButton() {
    let thisObject = this
    return function() {
      console.log('ALL button clicked')
      let newOptions = thisObject.getOptions()
      newOptions.witnesses = []
      thisObject.setOptions(thisObject.witnessList, newOptions)
      
    }
  }
  
  genOnClickNoneButton() {
    let thisObject = this
    return function() {
      console.log('NONE button clicked')
      let newOptions = thisObject.getOptions()
      newOptions.witnesses = []
      thisObject.setOptions(thisObject.witnessList, newOptions, false)
      
    }
  }
  
  
  //----------------------------------------------------------------
  // Drag and Drop Functions
  //----------------------------------------------------------------
  
  genOnDragStartFunc() {
    let thisObject = this
    return function (e) {
        // Target (this) element is the source node.
        thisObject.dragSourceElement = this
        thisObject.dragSourceParent = this.parentNode
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/html', this.outerHTML)
        this.classList.add(thisObject.dragElementClass)
      } 
  }
  
  genOnDragOver() {
    let thisObject = this
    return function (e) {
      if (e.preventDefault) {
        e.preventDefault(); // Necessary. Allows us to drop.
      }
      this.classList.add(thisObject.overClass);
      e.dataTransfer.dropEffect = 'move';  
      return false;
    }
  }
  
  genOnDragEnter() {
    let thisObject = this
    return function (e) {
      // this / e.target is the current hover target.
    }
  }
  
  genOnDragLeave() {
    let thisObject = this
    return function (e) {
      this.classList.remove(thisObject.overClass);  // this / e.target is previous target element.
    }
  }
  
  genOnDrop() {
    let thisObject = this
    return function (e) {
      // this/e.target is current target element.
      if (e.stopPropagation) {
        e.stopPropagation() // Stops some browsers from redirecting.
      }
      // Don't do anything if dropping the same column we're dragging.
      if (thisObject.dragSourceElement !== this) {
        // Set the source column's HTML to the HTML of the column we dropped on.
        thisObject.dragSourceParent.removeChild(thisObject.dragSourceElement)
        let dropHTML = e.dataTransfer.getData('text/html')
        this.insertAdjacentHTML('beforebegin',dropHTML)
        let dropElem = this.previousSibling
        thisObject.addWitnessBoxDnDHandlers(dropElem)
        thisObject.updateWitnessListFromBoxes()
        thisObject.dealWithEmptyBoxes()
        thisObject.dealWithNotEnoughWitnessesToInclude()
      }
      this.classList.remove(thisObject.overClass)
      return false;
    }
  }
  
  genOnDragEnd() {
    let thisObject = this
    return function (e) {
      this.classList.remove(thisObject.dragElementClass)
    }
  }
  
  
  genOnDropBox() {
    let thisObject = this
    return function(e) {
      e.preventDefault()
      let dropHtml = e.dataTransfer.getData('text/html')
      thisObject.dragSourceParent.removeChild(thisObject.dragSourceElement)
      this.insertAdjacentHTML('beforeend',dropHtml)
      thisObject.addWitnessBoxDnDHandlers(this.lastElementChild)
      this.classList.remove(thisObject.overBoxClass)
      thisObject.updateWitnessListFromBoxes()
      thisObject.dealWithEmptyBoxes()
      thisObject.dealWithNotEnoughWitnessesToInclude()
    }
  }
  genOnDragOverBox() {
    let thisObject = this
    return function (e) {
      if (e.preventDefault) {
        e.preventDefault(); // Necessary. Allows us to drop.
      }
      this.classList.add(thisObject.overBoxClass);
      e.dataTransfer.dropEffect = 'move';  
      return false;
    }
  }
  
  genOnDragLeaveBox() {
    let thisObject = this
    return function (e) {
      console.log('DragLeave Box')
      this.classList.remove(thisObject.overBoxClass)  // this / e.target is previous target element.
    }
  }
  
  genOnDragEndBox() {
    let thisObject = this
    return function (e) {
      console.log('DragEnd Box')
      this.classList.remove(thisObject.overBoxClass)
    }
  }
  
  

  addWitnessBoxDnDHandlers(elem) {
    elem.addEventListener('dragstart', this.genOnDragStartFunc(), false);
    elem.addEventListener('dragenter', this.genOnDragEnter(), false)
    elem.addEventListener('dragover', this.genOnDragOver(), false);
    elem.addEventListener('dragleave', this.genOnDragLeave(), false);
    elem.addEventListener('drop', this.genOnDrop(), false);
    elem.addEventListener('dragend', this.genOnDragEnd(), false);
  }
  
  //----------------------------------------------------------------
  // Form Template
  //----------------------------------------------------------------
  
  getFormTemplate() {
    return Twig.twig({
       id: 'theForm',
      data: `
      <h3>Automatic Collation Settings</h3>
        <form>
          <table class="table">
          <tr>
           <th>Witnesses Available</th>
           <th>Witnessess To Include 
              &nbsp;&nbsp;&nbsp;
              <button type="button" class="btn btn-default btn-xs all-btn">All</button>
              <button type="button" class="btn btn-default btn-xs none-btn">None</button>
           </tr>
           <tr>
          <td>
            <div class="witnessesavailable-box"></div>
          </td>
          <td>
            <div class="witnessestoinclude-box"></div>
          </td>
          </tr>
          </table>
          <div class="checkbox">
            <label><input type="checkbox" class="ignorepunct-cb">Ignore Punctuation</label>
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