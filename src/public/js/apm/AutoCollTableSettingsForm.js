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

/*
 * Mini-app to show and process a form where the user can
 * choose and arrange a list of witnesses to include in an automatic
 * collation table.
 */


/* global Twig */

class AutomaticCollationTableSettingsForm {
  
  constructor(options) {
    // Events generated by the form
    this.cancelEventName = 'cancel'
    this.applyEventName = 'apply'
    this.settingsChangeEventName = 'settings-change'

    this.dragElementClass = 'dragElem'
    this.overClass = 'over'
    this.overBoxClass = 'overBox'
    this.witnessDraggableClass = 'wdraggable'
    
    this.notEnoughWitnessesWarningHtml = '<p class="text-danger">' + 
            '<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>' + 
            ' Please select 2 or more witnesses to include in the collation table</p>'
    
    this.options = this.getCleanOptions(options)
    
    this.witnessList = []
    this.initialSettings = this.options.initialSettings

    let containerSelector = this.options.containerSelector
    //console.log('Building act setting form')
    //console.log(this.options)
    
    // Data for drag and drop
    this.dragSourceElement = null
    this.dragSourceParent = null 
    
    this.container = $(containerSelector)
    this.container.addClass('hidden')
    this.container.html(this.getFormTemplate().render({
      title: this.options.formTitle,
      applyButtonText: this.options.applyButtonText
    }))
    
    
    this.formTitle = $(containerSelector + ' .form-title')
    this.cancelButton = $(containerSelector + ' .cancel-btn')
    this.applyButton = $(containerSelector + ' .apply-btn')
    this.allButton = $(containerSelector + ' .all-btn')
    this.noneButton = $(containerSelector + ' .none-btn')
    this.savePresetButton = $(containerSelector + ' .save-preset-btn')
    this.ignorePunctuationCheckbox = $(containerSelector + ' .ignorepunct-cb')
    this.witnessesAvailableSelectBox = $(containerSelector + ' .witnessesavailable-box')
    this.witnessesToIncludeBox = $(containerSelector + ' .witnessestoinclude-box')
    this.warningDiv = $(containerSelector + ' .warningdiv')
    this.presetTitle = $(containerSelector + ' .preset-title')
    this.editPresetButton = $(containerSelector + ' .edit-preset-btn')
    this.editPresetDiv = $(containerSelector + ' .edit-preset-div')
    this.presetInputText = $(containerSelector + ' .preset-input-text')
    this.presetSaveButton = $(containerSelector + ' .preset-save-btn')
    this.presetSave2Button = $(containerSelector + ' .preset-save2-btn')
    this.presetCancelButton = $(containerSelector + ' .preset-cancel-btn')
    this.presetErrorSpan = $(containerSelector + ' .preset-error-span')
    this.presetErrorMsg = $(containerSelector + ' .preset-error-msg')
    
    if (this.options.hideTitle) {
      this.formTitle.hide()
    }
    
    this.cancelButton.on('click', this.genOnClickCancelButton())
    this.applyButton.on('click', this.genOnClickApplyButton())
    this.allButton.on('click', this.genOnClickAllButton())
    this.noneButton.on('click', this.genOnClickNoneButton())
    this.ignorePunctuationCheckbox.on('click', this.genOnClickIgnorePunctuationCheckbox())
    
    if (this.options.isPreset) {
      this.setPresetTitle()
    }
    this.editPresetButton.on('click', this.genOnClickEditPresetButton())
    this.presetCancelButton.on('click', this.genOnClickPresetCancelButton())
    this.presetInputText.on('keyup', this.genOnKeyUpPresetInputText())
    this.presetSaveButton.on('click', this.genOnClickPresetSaveButton())
    this.presetSave2Button.on('click', this.genOnClickPresetSave2Button())    
  }
  
  
  getDefaultOptions() {
    let options = {}
    
    options.langDef = { 
       la: { code: 'la', name: 'Latin', rtl: false, fontsize: 3},
       ar: { code: 'ar', name: 'Arabic', rtl: true, fontsize: 3},
       he: { code: 'he', name: 'Hebrew', rtl: true, fontsize: 3}
     } 
    options.availableWitnesses = []
    options.initialSettings = {
      work: 'no-work',
      chunk: 0,
      lang: 'la',
      ignorePunctuation: true,
      witnesses: []
    }
    options.containerSelector = 'default-act-settings-form-selector'
    options.formTitle = 'Automatic Collation Settings'
    options.applyButtonText = 'Apply'
    options.hideTitle = false
    options.isPreset = false
    options.preset = { 
      id: -1, 
      title: '', 
      userId: -1, 
      userName: 'nouser', 
      editable: false
    }
    options.noPresetTitle = '--- [none] ---'
    options.urlGenerator = {}
    options.userId = -1
    return options
  }
  
  getCleanOptions(inputOptions) {
    let cleanOptions = this.getDefaultOptions()
    
    if (typeof(inputOptions.langDef) === 'object') {
      cleanOptions.langDef = inputOptions.langDef
    }
    
    if (typeof(inputOptions.availableWitnesses) === 'object') {
      cleanOptions.availableWitnesses = inputOptions.availableWitnesses
      for (const w of cleanOptions.availableWitnesses) {
        if (typeof(w.id) !== 'number') {
          console.error('Witness id not a number in ACT settings form options: ' + 
                typeof(w.id) + ' ' + w.id)
        }
      }
    }
    
    if (typeof(inputOptions.initialSettings) === 'object') {
      cleanOptions.initialSettings = inputOptions.initialSettings
    }
   
    if (typeof(inputOptions.containerSelector) === 'string') {
      cleanOptions.containerSelector = inputOptions.containerSelector
    }

    if (typeof(inputOptions.formTitle) === 'string') {
      cleanOptions.formTitle = inputOptions.formTitle
    }
    
    if (typeof(inputOptions.hideTitle) === 'boolean') {
      cleanOptions.hideTitle = inputOptions.hideTitle
    }
    
    if (typeof(inputOptions.applyButtonText) === 'string') {
      cleanOptions.applyButtonText = inputOptions.applyButtonText
    }
    
    if (typeof(inputOptions.isPreset) === 'boolean') {
      cleanOptions.isPreset = inputOptions.isPreset
    }
    
    if (typeof(inputOptions.preset) === 'object') {
      cleanOptions.preset = inputOptions.preset
    }
    
    if (typeof(inputOptions.urlGenerator) === 'object') {
      cleanOptions.urlGenerator = inputOptions.urlGenerator
    }
    
    if (typeof(inputOptions.userId) === 'number') {
      cleanOptions.userId = inputOptions.userId
    }
    return cleanOptions
    
  }
  
  show(newSettings = false) {
    // NOTE: make the container visible before calling setOptions!
    this.container.removeClass('hidden')
    if (newSettings !== false) {
      this.initialSettings = newSettings
    }
    this.setSettings(this.initialSettings)
  }
  
  hide() {
    this.container.addClass('hidden')
  }
  
  isHidden() {
    return this.container.hasClass('hidden')
  }
  
  setPresetTitle() {
    if (this.options.isPreset) {
      if (this.options.preset.editable) {
        this.presetTitle.html(this.options.preset.title)
      } else {
        this.presetTitle.html(this.options.preset.title + ' <small><em>(' + 
                this.options.preset.userName + ')</em></small>')
      }
    } else {
      this.presetTitle.html(this.options.noPresetTitle)
    }
      
    
  }
  
  setSettings(settings = false) {
    if (settings === false) {
      settings = this.initialSettings
    }
    // 1. Build the witnesses master list
    this.witnessList = this.options.availableWitnesses
    for(const witness of this.witnessList) {
      witness.toInclude = false
    }
    for(const witnessToInclude of settings.witnesses) {
      for (const witness of this.witnessList) {
        if (witnessToInclude.type === witness.type && witnessToInclude.id === witness.id) {
          witness.toInclude = true
        }
      }
    }
    
    // 2. Set up options
    this.ignorePunctuationCheckbox.prop('checked', settings.ignorePunctuation)
        
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
    for(const witnessToInclude of settings.witnesses) {
      witnessesToIncludeHtml += witnessesToIncludeHtmlElements[witnessToInclude.id]
    }
    
    // 3.c set html in boxes
    this.witnessesAvailableSelectBox.html(witnessesAvailableHtml)
    this.witnessesToIncludeBox.html(witnessesToIncludeHtml)
    
    let witnessBoxes = document.querySelectorAll(this.options.containerSelector + ' .' + this.witnessDraggableClass);
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
    //console.log('witnesses to include: ' + count)
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
  
  getSettings() {
    let settings = {}
    settings.work = this.initialSettings.work
    settings.chunk = this.initialSettings.chunk
    settings.lang = this.initialSettings.lang
    settings.ignorePunctuation = this.ignorePunctuationCheckbox.is(':checked')
    settings.witnesses = []
    this.updateWitnessListFromBoxes()
    // Notice that the list of included witnesses can, in principle, be empty, which only means
    // that the user has not chosen any witnesses to include. In the context of calling the
    // collation API, an empty list of included witnesses means, however, that ALL witness are 
    // to be collated; it is up to the caller to handle this semantic difference.
    let wToIncludeBoxChildren = this.witnessesToIncludeBox.children()
    for(const elem of wToIncludeBoxChildren) {
      settings.witnesses.push({
        type: elem.getAttribute('type'),
        id: parseInt(elem.getAttribute('witnessid'))
      })
    }
    settings.partialCollation = true
    if (settings.witnesses.length === this.options.availableWitnesses.length) {
      settings.partialCollation = false
    }
    
    return settings
  }

  getTitleFromSettings(settings = false) {
    if (settings === false) {
      settings = this.getSettings()
    }
    
    let title = ''
    let numWitnesses = settings.witnesses.length
    if (numWitnesses === 0) {
      numWitnesses = this.options.availableWitnesses.length
    }
    
    title += this.options.langDef[settings.lang].name + ', '
    title += numWitnesses  + ' of ' 
    title += this.options.availableWitnesses.length + ' witnesses'
    
    if (settings.ignorePunctuation) {
      title += ', ignoring punctuation'
    }
        
    return title
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
      thisObject.dispatchEvent(thisObject.applyEventName, thisObject.getSettings())
    }
  }
  
  genOnClickIgnorePunctuationCheckbox() {
    let thisObject = this
    return function() {
      thisObject.dispatchEvent(thisObject.settingsChangeEventName, thisObject.getSettings())
    }
  }
  
  genOnClickAllButton() {
    let thisObject = this
    return function() {
      //console.log('ALL button clicked')
      let newSettings = thisObject.getSettings()
      newSettings.witnesses = []
      for(const witness of thisObject.witnessList) {
        witness.toInclude = true
        newSettings.witnesses.push({ type: witness.type, id: witness.id})
      }
      thisObject.setSettings(newSettings)
      thisObject.dispatchEvent(thisObject.settingsChangeEventName, thisObject.getSettings())
    }
  }
  
  genOnClickNoneButton() {
    let thisObject = this
    return function() {
      //console.log('NONE button clicked')
      let newSettings = thisObject.getSettings()
      newSettings.witnesses = []
      thisObject.setSettings(newSettings)
      thisObject.dispatchEvent(thisObject.settingsChangeEventName, thisObject.getSettings())
      
    }
  }
  
  genOnClickEditPresetButton() {
    let thisObject = this
    return function() {
      // set up mini form
      thisObject.presetInputText.val(thisObject.options.preset.title)
      thisObject.presetSaveButton.removeClass('disabled')
      thisObject.presetSave2Button.addClass('hidden')
      thisObject.presetErrorSpan.addClass('hidden')
      if (thisObject.options.isPreset && thisObject.options.preset.editable) {
        thisObject.presetSaveButton.html('Update Preset')
      } else {
        thisObject.presetInputText.val('My Preset ' + Math.floor(10000*Math.random()))
        thisObject.presetSaveButton.html('Save as New Preset')
      }
      
      // show edit preset mini form
      thisObject.editPresetDiv.removeClass('hidden')
      // hide title and edit button
      thisObject.editPresetButton.addClass('hidden')
      thisObject.presetTitle.addClass('hidden')
    }
  }
  
  genOnKeyUpPresetInputText() {
    let thisObject = this
    return function() {
      let presetText = thisObject.normalizePresetTitle(thisObject.presetInputText.val())
      
      if (presetText === '') {
        //console.log('Empty preset title')
        thisObject.presetSaveButton.addClass('disabled')
        thisObject.presetSave2Button.addClass('disabled')
        thisObject.presetErrorMsg.html('Preset name should not be empty')
        thisObject.presetErrorSpan.removeClass('hidden')
      } else {
        thisObject.presetSaveButton.removeClass('disabled')
        thisObject.presetSave2Button.removeClass('disabled')
        thisObject.presetErrorSpan.addClass('hidden')
      }
      if (!thisObject.options.isPreset) {
        return true
      }
      if (!thisObject.options.preset.editable) {
        return true;
      }
      
      if (presetText !== thisObject.options.preset.title) {
        //console.log('Change in preset title')
        thisObject.presetSaveButton.html('Update/Rename Preset')
        thisObject.presetSave2Button.removeClass('hidden')
      } else {
        //console.log('Back to initial preset title')
        thisObject.presetSaveButton.html('Update Preset')
        thisObject.presetSave2Button.addClass('hidden')
      }
    }
  }
  
  genOnClickPresetSaveButton() {
    let thisObject = this
    return function() {
      let newPresetTitle = thisObject.normalizePresetTitle(thisObject.presetInputText.val())
      let currentSettings = thisObject.getSettings()
      let witnessIdArray =[] 
      for(const w of currentSettings.witnesses) {
        witnessIdArray.push(parseInt(w.id))
      }
      if (!thisObject.options.isPreset || !thisObject.options.preset.editable) {
        console.log('Saving to a new preset: ' + newPresetTitle)
        let apiCallOptions = {
          command: 'new',
          tool: 'automaticCollation',
          userId: thisObject.options.userId,
          title: newPresetTitle,
          presetId: -1,
          presetData : {
            lang: currentSettings.lang,
            witnesses: witnessIdArray,
            ignorePunctuation: currentSettings.ignorePunctuation
          }
        }
        console.log(apiCallOptions)
        $.post(
          thisObject.options.urlGenerator.apiPostPresets(), 
          { data: JSON.stringify(apiCallOptions) }
        ).done(function(data){
          console.log('New preset API call successful')
          console.log(data)
          thisObject.dispatchEvent('preset-new', data)
          thisObject.presetTitle.html(newPresetTitle)
          thisObject.options.isPreset = true
          thisObject.options.preset = {
            id: data.presetId,
            title: newPresetTitle,
            userId: thisObject.options.userId,
            userName: 'current user', // TODO: change this
            editable: true
          }
          // hide edit preset mini form
          thisObject.editPresetDiv.addClass('hidden')
          // show title and edit button
          thisObject.editPresetButton.removeClass('hidden')
          thisObject.presetTitle.removeClass('hidden')
          
        }).fail(function(resp) {
          console.error('New preset API call failed')
          console.log(resp)
          thisObject.presetErrorMsg.html('Cannot create new preset')
          thisObject.presetErrorSpan.removeClass('hidden')
        })
        return false
      }
      console.log('Updating current preset')
      let apiCallOptions = {
          command: 'update',
          tool: 'automaticCollation',
          userId: thisObject.options.userId,
          title: newPresetTitle,
          presetId: thisObject.options.preset.id,
          presetData : {
            lang: currentSettings.lang,
            witnesses: witnessIdArray,
            ignorePunctuation: currentSettings.ignorePunctuation
          }
        }
        console.log(apiCallOptions)
        $.post(
          thisObject.options.urlGenerator.apiPostPresets(), 
          { data: JSON.stringify(apiCallOptions) }
        ).done(function(data){
          console.log('Preset updated successfully')
          console.log(data)
          thisObject.dispatchEvent('preset-updated', data)
          thisObject.presetTitle.html(newPresetTitle)
          thisObject.options.preset.title = newPresetTitle
          // hide edit preset mini form
          thisObject.editPresetDiv.addClass('hidden')
          // show title and edit button
          thisObject.editPresetButton.removeClass('hidden')
          thisObject.presetTitle.removeClass('hidden')
          thisObject.presetTitle.removeClass('hidden')
        }).fail(function(resp) {
          if (resp.status === 409 && resp.responseJSON.error === 4007) {
            console.error('Cannot update preset: preset not found')
            thisObject.presetErrorMsg.html('Preset not in database, did you erase it?')
            thisObject.presetErrorSpan.removeClass('hidden')
            thisObject.options.isPreset = false
            thisObject.setPresetTitle()
            return false
          }
          console.error('Preset POST failed')
          console.log(resp)
        })
      
    }   
  }
  
  genOnClickPresetSave2Button() {
    let thisObject = this
    return function() {
      if (!thisObject.options.isPreset || !thisObject.options.preset.editable) {
        console.error('Click on save 2 on non-editable or non-preset')
        return false
      }
      console.log('Saving existing preset to a new one')
      let newPresetTitle = thisObject.normalizePresetTitle(thisObject.presetInputText.val())
      let currentSettings = thisObject.getSettings()
      let witnessIdArray =[] 
      for(const w of currentSettings.witnesses) {
        witnessIdArray.push(parseInt(w.id))
      }
      let apiCallOptions = {
        command: 'new',
        tool: 'automaticCollation',
        userId: thisObject.options.userId,
        title: newPresetTitle,
        presetId: -1,
        presetData : {
          lang: currentSettings.lang,
          witnesses: witnessIdArray,
          ignorePunctuation: currentSettings.ignorePunctuation
        }
      }
      console.log(apiCallOptions)
      $.post(
        thisObject.options.urlGenerator.apiPostPresets(), 
        { data: JSON.stringify(apiCallOptions) }
      ).done(function(data){
        console.log('New preset API call successful')
        console.log(data)
        thisObject.dispatchEvent('preset-new', data)
        thisObject.presetTitle.html(newPresetTitle)
        thisObject.options.preset.title = newPresetTitle
          // hide edit preset mini form
        thisObject.editPresetDiv.addClass('hidden')
          // show title and edit button
        thisObject.editPresetButton.removeClass('hidden')
        thisObject.presetTitle.removeClass('hidden')
        thisObject.presetTitle.removeClass('hidden')
      }).fail(function(resp) {
        console.error('New preset API call failed')
        console.log(resp)
        thisObject.presetErrorMsg.html('Cannot create new preset')
        thisObject.presetErrorSpan.removeClass('hidden')
      })
      return false
    }   
 }   
    
  genOnClickPresetCancelButton() {
    let thisObject = this
    return function() {
      // hide edit preset mini form
      thisObject.editPresetDiv.addClass('hidden')
      // show title and edit button
      thisObject.editPresetButton.removeClass('hidden')
      thisObject.presetTitle.removeClass('hidden')
    }
  }
  
  normalizePresetTitle(title) {
    let normalizedTitle = title
    normalizedTitle = normalizedTitle.replace(/^\s+|\s+$/g, "")
    normalizedTitle = normalizedTitle.replace(/\s+/g, " ")
    return normalizedTitle
  }
  
  //----------------------------------------------------------------
  // Drag and Drop Functions
  //----------------------------------------------------------------
  
  genOnDragStartFunc() {
    let thisObject = this
    return function (e) {
        //console.log('drag start')
        // Target (this) element is the source node.
        thisObject.dragSourceElement = this
        thisObject.dragSourceParent = this.parentNode
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/html', this.outerHTML)
        this.classList.add(thisObject.dragElementClass)
        return false
      } 
  }
  
  genOnDragOver() {
    let thisObject = this
    return function (e) {
      //console.log('drag over')
      if (e.preventDefault) {
        e.preventDefault() // Necessary. Allows us to drop.
      }
      this.classList.add(thisObject.overClass)
      e.dataTransfer.dropEffect = 'move'
      return false
    }
  }
  
  genOnDragEnter() {
    let thisObject = this
    return function (e) {
      //console.log('drag enter')
      // this / e.target is the current hover target.
    }
  }
  
  genOnDragLeave() {
    let thisObject = this
    return function (e) {
      //console.log('drag leave')
      this.classList.remove(thisObject.overClass)  // this / e.target is previous target element.
      return false
    }
  }
  
  genOnDrop() {
    let thisObject = this
    return function (e) {
      //console.log('drop')
      // this/e.target is current target element.
      if (e.stopPropagation) {
        e.stopPropagation() // Stops some browsers from redirecting.
      }
      // Don't do anything if dropping the same element we're dragging.
      if (thisObject.dragSourceElement !== this) {
        // remove 
        thisObject.dragSourceParent.removeChild(thisObject.dragSourceElement)
        let dropHTML = e.dataTransfer.getData('text/html')
        this.insertAdjacentHTML('beforebegin',dropHTML)
        let dropElem = this.previousSibling
        thisObject.addWitnessBoxDnDHandlers(dropElem)
        thisObject.updateWitnessListFromBoxes()
        thisObject.dealWithEmptyBoxes()
        thisObject.dealWithNotEnoughWitnessesToInclude()
        thisObject.dispatchEvent(thisObject.settingsChangeEventName, thisObject.getSettings())
      }
      this.classList.remove(thisObject.overClass)
      return false
    }
  }
  
  genOnDragEnd() {
    let thisObject = this
    return function (e) {
      //console.log('drag end')
      this.classList.remove(thisObject.dragElementClass)
      thisObject.dispatchEvent(thisObject.settingsChangeEventName, thisObject.getSettings())
    }
  }
  
  
  genOnDropBox() {
    let thisObject = this
    return function(e) {
      //console.log('drop box')
      e.preventDefault()
      let dropHtml = e.dataTransfer.getData('text/html')
      thisObject.dragSourceParent.removeChild(thisObject.dragSourceElement)
      this.insertAdjacentHTML('beforeend',dropHtml)
      thisObject.addWitnessBoxDnDHandlers(this.lastElementChild)
      this.classList.remove(thisObject.overBoxClass)
      thisObject.updateWitnessListFromBoxes()
      thisObject.dealWithEmptyBoxes()
      thisObject.dealWithNotEnoughWitnessesToInclude()
      return false
    }
  }
  
  genOnDragOverBox() {
    let thisObject = this
    return function (e) {
      //console.log('drag over box')
      if (e.preventDefault) {
        e.preventDefault() // Necessary. Allows us to drop.
      }
      this.classList.add(thisObject.overBoxClass)
      e.dataTransfer.dropEffect = 'move'
      return false
    }
  }
  
  genOnDragLeaveBox() {
    let thisObject = this
    return function (e) {
      //console.log('drag leave Box')
      this.classList.remove(thisObject.overBoxClass)  // this / e.target is previous target element.
    }
  }
  
  genOnDragEndBox() {
    let thisObject = this
    return function (e) {
      //console.log('drag end box')
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
    let randomNumber = Math.floor(Math.random() * 1000000) +1
    return  Twig.twig({
       id: 'theForm' + randomNumber,
      data: `
      <h3 class="form-title">{{title}}</h3>
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
            <div class="preset-buttons-div">
         <b>Preset</b>: <span class="preset-title">--- [ none ] ---</span>
            <button type="button" class="btn btn-default btn-xs edit-preset-btn">
            Edit
            </button>

      <span class="edit-preset-div hidden">
            <input type="text" class="preset-input-text" value="--"></input>
            <button type="button" class="btn btn-default btn-xs preset-save-btn">
              Save as Preset
            </button>
      <button type="button" class="btn btn-default btn-xs preset-save2-btn hidden">
              Save as New Preset
            </button>
      <button type="button" class="btn btn-default btn-xs preset-cancel-btn">
              Cancel
            </button>
      <span class="text-danger preset-error-span hidden">
        <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
        <span class="preset-error-msg"></span></span>
      </span>
      </div>
          <button type="button" class="btn btn-primary btn-sm apply-btn">
            {{applyButtonText}}
          </button>
          <button type="button" class="btn btn-default btn-sm cancel-btn">
            Cancel
          </button>
          &nbsp;&nbsp;&nbsp;

        </form>
      <div class="warningdiv"></div>
`
    })
  }
}