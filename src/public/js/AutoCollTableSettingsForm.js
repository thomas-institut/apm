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


const defaultHelpIcon = '<i class="fas fa-info"></i>'
/* global Twig */


import {OptionsChecker} from '@thomas-inst/optionschecker'

import {arraysHaveTheSameValues} from './toolbox/ArrayUtil'

export class AutomaticCollationTableSettingsForm {

  constructor(options) {
    // Events generated by the form
    this.cancelEventName = 'cancel'
    this.applyEventName = 'apply'
    this.settingsChangeEventName = 'settings-change'

    this.dragElementClass = 'dragElem'
    this.overClass = 'over'
    this.overBoxClass = 'overBox'
    this.witnessDraggableClass = 'wdraggable'

    this.automaticCollationPresetTool = 'automaticCollation_v2'
    
    this.notEnoughWitnessesWarningHtml = '<p class="text-danger">' + 
            '<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>' + 
            ' Please select 2 or more witnesses to include in the collation table</p>'

    let optionsDefinition = {
      langDef : { type: 'object', default: {
          la: { code: 'la', name: 'Latin', rtl: false, fontsize: 3},
          ar: { code: 'ar', name: 'Arabic', rtl: true, fontsize: 3},
          he: { code: 'he', name: 'Hebrew', rtl: true, fontsize: 3}
        }
      },
      availableWitnesses: { type: 'Array', default: [] },
      initialSettings: { type: 'object', default: {
          work: 'no-work',
          chunk: 0,
          lang: 'la',
          ignorePunctuation: true,
          witnesses: []
        }
      },
      suppressTimestampsInSettings: { type: 'boolean', default: false},
      containerSelector: { type: 'string', default : 'default-act-settings-form-selector'},
      formTitle: { type: 'string', default : 'Automatic Collation Settings'},
      applyButtonText: { type: 'string', default : 'Apply'},
      hideTitle: { type: 'boolean', default: false},
      isPreset: { type: 'boolean', default: false},
      urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true},
      userId: { type: 'number', default: -1 },
      normalizerData: {type: 'Array', default: []},
      icons : {
        type: 'object', default:  {
          help: defaultHelpIcon
          }
      },
      noPresetTitle: { type: 'string', default : '--- [none] ---'},
      preset: { type: 'object', default: {
          id: -1,
          title: '',
          userId: -1,
          userName: 'noUser',
          editable: false
        }
      },
      verbose: { type: 'boolean', default: false},
      debug: { type: 'boolean', default: false}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "AutoCollTableSettingsForm"})
    this.options = oc.getCleanOptions(options)

    // console.log('AutoCollTableSettingsFrom options')
    // console.log(this.options)


    this.witnessList = []
    this.initialSettings = this.options.initialSettings
    this.verbose = this.options.verbose
    this.debug = this.options.debug
    if (this.debug) {
      this.verbose = true
    }


    let containerSelector = this.options.containerSelector

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
    this.normalizersDiv = $(containerSelector + ' .normalizersDiv')
    this.cancelButton = $(containerSelector + ' .cancel-btn')
    this.applyButton = $(containerSelector + ' .apply-btn')
    this.allButton = $(containerSelector + ' .all-btn')
    this.noneButton = $(containerSelector + ' .none-btn')
    // this.savePresetButton = $(containerSelector + ' .save-preset-btn')
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

    // this.allNormalizerCheckBoxes = $(containerSelector + ' .normalizer-checkbox')
    
    if (this.options.hideTitle) {
      this.formTitle.hide()
    }
    
    this.cancelButton.on('click', this.genOnClickCancelButton())
    this.applyButton.on('click', this.genOnClickApplyButton())
    this.allButton.on('click', this.genOnClickAllButton())
    this.noneButton.on('click', this.genOnClickNoneButton())
    this.ignorePunctuationCheckbox.on('click', this.genOnClickIgnorePunctuationCheckbox())
    this.setNormalizersDiv()
    
    if (this.options.isPreset) {
      this.setPresetTitle()
    }
    this.editPresetButton.on('click', this.genOnClickEditPresetButton())
    this.presetCancelButton.on('click', this.genOnClickPresetCancelButton())
    this.presetInputText.on('keyup', this.genOnKeyUpPresetInputText())
    this.presetSaveButton.on('click', this.genOnClickPresetSaveButton())
    this.presetSave2Button.on('click', this.genOnClickPresetSave2Button())    
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

  setNormalizersDiv() {
    if (this.options.normalizerData.length === 0) {
      console.log(`ACT Settings: no normalizers defined`)
      return
    }
    let html = '<h5>Standard Normalizations</h5><ul class="normalization-list">'
    this.options.normalizerData.forEach( (data) => {
      //console.log(`Setting up ${data['name']}`)
      let info = data['metadata']['automaticCollation']
      html += `<li><input type="checkbox" class="normalizer-checkbox normalizer-${data['name']}" title="${info['help']}">&nbsp;&nbsp;${info['label']}</li>`
    })
    html += '</ul>'
    this.normalizersDiv.html(html)
  }
  
  setSettings(settings = false) {
    this.verbose && console.log('Setting settings')
    this.verbose && console.log(settings)
    if (settings === false) {
      settings = this.initialSettings
    }
    // 1. Build the witnesses master list
    this.witnessList = this.options.availableWitnesses
    for(const witness of this.witnessList) {
      witness.toInclude = false
      witness.internalId = this.getInternalIdFromWitness(witness)
    }
    for(const witnessToInclude of settings.witnesses) {
      for (const witness of this.witnessList) {
        if (witnessToInclude.type === witness.type && this.systemIdsCorrespond(witnessToInclude.systemId, witness.systemId)) {
          this.verbose && console.log(`Including witness ${witness['title']}`)
          witness.toInclude = true
        }
      }
    }

    this.verbose && console.log('Witness list')
    this.verbose && console.log(this.witnessList)
    
    // 2. Set up options
    this.ignorePunctuationCheckbox.prop('checked', settings.ignorePunctuation)


    if (settings.normalizers === undefined || settings.normalizers === null) {
      this.verbose && console.log(`No normalizers defined in setting, defaulting to all checked`)
      $(`${this.options.containerSelector} .normalizer-checkbox`).prop('checked', true)
    } else {
      settings.normalizers.forEach( (name) => {
        $(`${this.options.containerSelector} .normalizer-${name}`).prop('checked', true)
      })
    }

    // 3. Set up witness boxes
    
    // 3.a. Prepare html for boxes
    this.debug && console.log('Preparing html for boxes')
    let witnessesAvailableHtml = ''
    let witnessesToIncludeHtml = ''
    let witnessesToIncludeHtmlElements = []
    for(const witness of this.witnessList) {
      this.debug && console.log(`Processing witness ${witness['title']}`)
      let theHtml = this.getWitnessDraggableHtml(witness)
      // this.debug && console.log('The HTML:  ' + theHtml)
      if (!witness.toInclude) {
        witnessesAvailableHtml += theHtml
      } else {
        witnessesToIncludeHtmlElements[witness.internalId] = theHtml
      }
    }
    // 3.b arrange the elements of the toInclude box in the order given in the options 
    for(const witnessToInclude of settings.witnesses) {
      let theWitness = this.getWitnessFromSystemId(witnessToInclude.systemId)
      witnessesToIncludeHtml += witnessesToIncludeHtmlElements[theWitness.internalId]
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

  /**
   * return true if the given systemIds stripped of their
   * timestamp part are equal
   *
   * @param sysId1
   * @param sysId2
   */
  systemIdsCorrespond(sysId1, sysId2) {
    return this.suppressTimestampFromSystemId(sysId1) ===this.suppressTimestampFromSystemId(sysId2);
  }

  getInternalIdFromWitness(witness) {
    return witness.type + '-' + witness['typeSpecificInfo']['docId'] + '-' + witness['typeSpecificInfo']['localWitnessId']
  }

  getWitnessFromSystemId(systemId) {
    for(const witness of this.witnessList) {
      if (this.systemIdsCorrespond(systemId,witness.systemId)) {
        return witness
      }
    }
    return false;
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

  _saveAndAddEventListenersAvailableWitnessBox() {
    this.onDropBoxFunctionForAvailableWitnesses = this.genOnDropBox()
    this.onDragOverFunctionForAvailableWitnesses = this.genOnDragOverBox()
    this.onDragLeaveFunctionForAvailableWitnesses = this.genOnDragLeaveBox()
    this.onDragEndFunctionForAvailableWitnesses = this.genOnDragEndBox()
    this.witnessesAvailableSelectBox.get(0).addEventListener('drop', this.onDropBoxFunctionForAvailableWitnesses, false)
    this.witnessesAvailableSelectBox.get(0).addEventListener('dragover', this.onDragOverFunctionForAvailableWitnesses, false)
    this.witnessesAvailableSelectBox.get(0).addEventListener('dragleave', this.onDragLeaveFunctionForAvailableWitnesses, false)
    this.witnessesAvailableSelectBox.get(0).addEventListener('dragend', this.onDragEndFunctionForAvailableWitnesses, false)
  }

  _removeEventListenersAvailableWitnessBox() {
    this.witnessesAvailableSelectBox.get(0).removeEventListener('drop', this.onDropBoxFunctionForAvailableWitnesses, false)
    this.witnessesAvailableSelectBox.get(0).removeEventListener('dragover', this.onDragOverFunctionForAvailableWitnesses, false)
    this.witnessesAvailableSelectBox.get(0).removeEventListener('dragleave', this.onDragLeaveFunctionForAvailableWitnesses, false)
    this.witnessesAvailableSelectBox.get(0).removeEventListener('dragend', this.onDragEndFunctionForAvailableWitnesses, false)
  }

  _saveAndAddEventListenersWitnessesToIncludeBox() {
    this.onDropBoxFunctionForWitnessesToInclude = this.genOnDropBox()
    this.onDragOverFunctionForWitnessesToInclude = this.genOnDragOverBox()
    this.onDragLeaveFunctionForWitnessesToInclude = this.genOnDragLeaveBox()
    this.onDragEndFunctionForWitnessesToInclude = this.genOnDragEndBox()
    this.witnessesToIncludeBox.get(0).addEventListener('drop', this.onDropBoxFunctionForWitnessesToInclude, false)
    this.witnessesToIncludeBox.get(0).addEventListener('dragover', this.onDragOverFunctionForWitnessesToInclude, false)
    this.witnessesToIncludeBox.get(0).addEventListener('dragleave', this.onDragLeaveFunctionForWitnessesToInclude, false)
    this.witnessesToIncludeBox.get(0).addEventListener('dragend', this.onDragEndFunctionForWitnessesToInclude, false)
  }

  _removeEventListenersWitnessesToIncludeBox() {
    this.witnessesToIncludeBox.get(0).removeEventListener('drop', this.onDropBoxFunctionForWitnessesToInclude, false)
    this.witnessesToIncludeBox.get(0).removeEventListener('dragover', this.onDragOverFunctionForWitnessesToInclude, false)
    this.witnessesToIncludeBox.get(0).removeEventListener('dragleave', this.onDragLeaveFunctionForWitnessesToInclude, false)
    this.witnessesToIncludeBox.get(0).removeEventListener('dragend', this.onDragEndFunctionForWitnessesToInclude, false)
  }

  dealWithEmptyBoxes() {
    this.debug && console.log(`Dealing with empty boxes`)

    // Available Witness Box
    if (this.getAvailableWitnessesCount() === 0) {
      this.debug && console.log(`Available Witnesses box is empty`)
      // Available witness box is empty: save the event listeners so that we can remove them later on
      this._saveAndAddEventListenersAvailableWitnessBox()
      // make the box bigger, so that it can actually be seen
      // NOTE: the form container must be visible for this work
      this.witnessesAvailableSelectBox.css('height', this.witnessesToIncludeBox.height() +  'px')
    } else {
      // There are items in the box, so we don't need to whole box itself 
      // to be able to receive items
      this._removeEventListenersAvailableWitnessBox()
      this.witnessesAvailableSelectBox.css('height', 'auto')
    }

    // Witnesses to include box
    if(this.getToIncludeWitnessesCount() === 0) {
      this.debug && console.log(`Witnesses To Include box is empty`)
      // save the functions so that we can remove the event listeners later on
      this._saveAndAddEventListenersWitnessesToIncludeBox()
      // make the box bigger, so that it can actually be seen
      // NOTE: the form container must be visible for this work
      this.witnessesToIncludeBox.css('height', this.witnessesAvailableSelectBox.height() +  'px')
    } else {
      // There are items in the box, so we don't need to whole box itself 
      // to be able to receive items
      this._removeEventListenersWitnessesToIncludeBox()
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
    return this.witnessList.filter( (w) => { return w.toInclude}).length
    // let count = 0
    // for(const witness of this.witnessList) {
    //   if (witness.toInclude) {
    //     count++
    //   }
    // }
    // return count
  }
  
  updateWitnessListFromBoxes() {
    let wAvailableBoxChildren = this.witnessesAvailableSelectBox.children()
    for(const elem of wAvailableBoxChildren) {
      for(const witness of this.witnessList) {
        let witnessIndex = witness.internalId
        if (witness.type === elem.getAttribute('type') && ( elem.getAttribute('witnessid') === witnessIndex)) {
          witness.toInclude = false
          break
        }
      }
    }
    let wToIncludeBoxChildren = this.witnessesToIncludeBox.children()
    for(const elem of wToIncludeBoxChildren) {
      for(const witness of this.witnessList) {
        let witnessIndex = witness.internalId
        if (witness.type === elem.getAttribute('type') && ( elem.getAttribute('witnessid') === witnessIndex)) {
          witness.toInclude = true
          break
        }
      }
    }
  }
  
  getWitnessDraggableHtml(witness) {
    return '<p class="btn-default btn-sm btn-witness wdraggable" draggable="true" ' +
            'type="' + witness.type + '" witnessid="' + witness.internalId + '">' + witness.title + '</p>'
  }

  getNormalizerNamesFromCheckBoxes() {
    let containerSelector = this.options.containerSelector
    return this.getNormalizerNamesFromOptions().filter( (name) => {
      return $(`${containerSelector} .normalizer-${name}`).prop('checked')
    })
  }

  getNormalizerNamesFromOptions() {
    return this.options.normalizerData.map ( (data) => { return data['name']})
  }

  getSettings() {
    let settings = {}
    settings.work = this.initialSettings.work
    settings.chunk = this.initialSettings.chunk
    settings.lang = this.initialSettings.lang
    settings.ignorePunctuation = this.ignorePunctuationCheckbox.is(':checked')

    let normalizers = this.getNormalizerNamesFromCheckBoxes()

    if (arraysHaveTheSameValues(normalizers, this.getNormalizerNamesFromOptions())){
      this.debug && console.log(`All standard normalizers checked`)
    }else {
      this.debug && console.log(`Custom normalizers in settings: [${normalizers.join(', ')}]`)
      settings.normalizers = normalizers
    }

    settings.witnesses = []
    this.updateWitnessListFromBoxes()
    // Notice that the list of included witnesses can, in principle, be empty, which only means
    // that the user has not chosen any witnesses to include. In the context of calling the
    // collation API, an empty list of included witnesses means, however, that ALL witness are 
    // to be collated; it is up to the caller to handle this semantic difference.
    let wToIncludeBoxChildren = this.witnessesToIncludeBox.children()
    for(const elem of wToIncludeBoxChildren) {
      let internalId = elem.getAttribute('witnessid')
      for(const witness of this.witnessList) {
        if (witness.internalId === internalId) {
          let sysId = witness.systemId
          if (this.options.suppressTimestampsInSettings) {
            sysId = this.suppressTimestampFromSystemId(sysId)
          }
          settings.witnesses.push({
            type: witness.type,
            systemId: sysId,
            title: witness.title
          })
        }
      }
    }

    settings.partialCollation = settings.witnesses.length !== this.options.availableWitnesses.length;
    
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

    if ( settings.normalizers === undefined || settings.normalizers === null ||
      settings.normalizers.length !== 0 )
     {

      title += ', normalization applied'
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
      this.debug && console.log('ALL button clicked')
      let newSettings = thisObject.getSettings()
      newSettings.witnesses = []
      for(const witness of thisObject.witnessList) {
        witness.toInclude = true
        newSettings.witnesses.push(witness)
      }
      thisObject.setSettings(newSettings)
      thisObject.dispatchEvent(thisObject.settingsChangeEventName, thisObject.getSettings())
    }
  }
  
  genOnClickNoneButton() {
    let thisObject = this
    return function() {
      this.debug && console.log('NONE button clicked')
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
        this.debug && console.log('Empty preset title')
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
        this.debug && console.log('Change in preset title')
        thisObject.presetSaveButton.html('Update/Rename Preset')
        thisObject.presetSave2Button.removeClass('hidden')
      } else {
        this.debug && console.log('Back to initial preset title')
        thisObject.presetSaveButton.html('Update Preset')
        thisObject.presetSave2Button.addClass('hidden')
      }
    }
  }
  
  genOnClickPresetSaveButton() {
    let thisObject = this
    return () => {
      this.verbose && console.log('Saving preset')
      let newPresetTitle = thisObject.normalizePresetTitle(thisObject.presetInputText.val())
      let currentSettings = thisObject.getSettings()
      this.debug && console.log('Current settings')
      this.debug && console.log(currentSettings)
      let witnessIdArray =[] 
      for(const w of currentSettings.witnesses) {
        if (w.type === 'fullTx') {
          let docId = w.systemId.split('-')[3]
          let lwid = w.systemId.split('-')[4]
          witnessIdArray.push('fullTx-' + docId + '-' + lwid)
        }
      }
      if (!thisObject.options.isPreset || !thisObject.options.preset.editable) {
        this.verbose && console.log('Saving to a new preset: ' + newPresetTitle)
        let apiCallOptions = {
          command: 'new',
          tool: thisObject.automaticCollationPresetTool,
          userId: thisObject.options.userId,
          title: newPresetTitle,
          presetId: -1,
          presetData : {
            lang: currentSettings.lang,
            witnesses: witnessIdArray,
            ignorePunctuation: currentSettings.ignorePunctuation,
            normalizers: currentSettings.normalizers !== undefined ? currentSettings.normalizers : null
          }
        }
        this.debug && console.log(apiCallOptions)
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
          
        }).fail((resp) => {
          this.verbose && console.error('New preset API call failed')
          this.verbose && console.log(resp)
          thisObject.presetErrorMsg.html('Cannot create new preset')
          thisObject.presetErrorSpan.removeClass('hidden')
        })
        return false
      }
      this.verbose && console.log('Updating current preset')
      let apiCallOptions = {
          command: 'update',
          tool: thisObject.automaticCollationPresetTool,
          userId: thisObject.options.userId,
          title: newPresetTitle,
          presetId: thisObject.options.preset.id,
          presetData : {
            lang: currentSettings.lang,
            witnesses: witnessIdArray,
            ignorePunctuation: currentSettings.ignorePunctuation,
            normalizers: currentSettings.normalizers !== undefined ? currentSettings.normalizers : null
          }
        }
        console.log(apiCallOptions)
        $.post(
          thisObject.options.urlGenerator.apiPostPresets(), 
          { data: JSON.stringify(apiCallOptions) }
        ).done((data) => {
          this.verbose && console.log('Preset updated successfully')
          this.verbose && console.log(data)
          thisObject.dispatchEvent('preset-updated', data)
          thisObject.presetTitle.html(newPresetTitle)
          thisObject.options.preset.title = newPresetTitle
          // hide edit preset mini form
          thisObject.editPresetDiv.addClass('hidden')
          // show title and edit button
          thisObject.editPresetButton.removeClass('hidden')
          thisObject.presetTitle.removeClass('hidden')
          thisObject.presetTitle.removeClass('hidden')
        }).fail((resp) => {
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
    return () => {
      if (!thisObject.options.isPreset || !thisObject.options.preset.editable) {
        console.error('Click on save 2 on non-editable or non-preset')
        return false
      }
      this.verbose && console.log('Saving existing preset to a new one')
      let newPresetTitle = thisObject.normalizePresetTitle(thisObject.presetInputText.val())
      let currentSettings = thisObject.getSettings()
      let witnessIdArray =[]
      for(const w of currentSettings.witnesses) {
        if (w.type === 'fullTx') {
          let docId = w.systemId.split('-')[3]
          let lwid = w.systemId.split('-')[4]
          witnessIdArray.push('fullTx-' + docId + '-' + lwid)
        }
      }
      let apiCallOptions = {
        command: 'new',
        tool: thisObject.automaticCollationPresetTool,
        userId: thisObject.options.userId,
        title: newPresetTitle,
        presetId: -1,
        presetData : {
          lang: currentSettings.lang,
          witnesses: witnessIdArray,
          ignorePunctuation: currentSettings.ignorePunctuation,
          normalizers: currentSettings.normalizers !== undefined ? currentSettings.normalizers : null
        }
      }
      this.debug && console.log(apiCallOptions)
      $.post(
        thisObject.options.urlGenerator.apiPostPresets(), 
        { data: JSON.stringify(apiCallOptions) }
      ).done((data) => {
        this.verbose && console.log('New preset API call successful')
        this.debug && console.log(data)
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
    return () => {
      // hide edit preset mini form
      this.editPresetDiv.addClass('hidden')
      // show title and edit button
      this.editPresetButton.removeClass('hidden')
      this.presetTitle.removeClass('hidden')
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
    return  function(e){
        thisObject.debug && console.log('drag start')
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
      thisObject.debug && console.log('drag over')
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
      thisObject.debug && console.log('drag enter')
      // this / e.target is the current hover target.
    }
  }
  
  genOnDragLeave() {
    let thisObject = this
    return function () {
      thisObject.debug && console.log('drag leave')
      this.classList.remove(thisObject.overClass)  // this / e.target is previous target element.
      return false
    }
  }
  
  genOnDrop() {
    let thisObject = this
    return function (e) {
      thisObject.debug && console.log('drop')
      // this/e.target is current target element.
      if (e.stopPropagation) {
        e.stopPropagation() // Stops some browsers from redirecting.
      }
      // Don't do anything if dropping the same element we're dragging.
      if (thisObject.dragSourceElement !== this) {
        // remove 
        thisObject.dragSourceParent.removeChild(thisObject.dragSourceElement)
        let dropHTML = e.dataTransfer.getData('text/html')
        this.insertAdjacentHTML('beforebegin', dropHTML)
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
    return function () {
      thisObject.debug && console.log('drag end')
      this.classList.remove(thisObject.dragElementClass)
      thisObject.dispatchEvent(thisObject.settingsChangeEventName, thisObject.getSettings())
    }
  }
  
  
  genOnDropBox() {
    let thisObject = this
    return function(e) {
      thisObject.debug && console.log('drop box')
      e.preventDefault()
      let dropHtml = e.dataTransfer.getData('text/html')
      thisObject.dragSourceParent.removeChild(thisObject.dragSourceElement)
      this.insertAdjacentHTML('beforeend', dropHtml)
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
      thisObject.debug && console.log('drag over box')
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
    return function () {
      thisObject.debug && console.log('drag leave Box')
      this.classList.remove(thisObject.overBoxClass)  // this / e.target is previous target element.
    }
  }
  
  genOnDragEndBox() {
    let thisObject = this
    return function () {
      thisObject.debug && console.log('drag end box')
      this.classList.remove(thisObject.overBoxClass)
    }
  }

  addWitnessBoxDnDHandlers(elem) {
    this.debug && console.log(`Adding witness box DnD handlers ${elem.innerHTML}`)
    elem.addEventListener('dragstart', this.genOnDragStartFunc(), false);
    elem.addEventListener('dragenter', this.genOnDragEnter(), false)
    elem.addEventListener('dragover', this.genOnDragOver(), false);
    elem.addEventListener('dragleave', this.genOnDragLeave(), false);
    elem.addEventListener('drop', this.genOnDrop(), false);
    elem.addEventListener('dragend', this.genOnDragEnd(), false);
  }

  suppressTimestampFromSystemId(systemId) {
    let fields = systemId.split('-')
    if (fields.length === 6 ) {
      fields.pop()
    }
    return fields.join('-')
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
           <th>Witnesses To Include 
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
            <label><input type="checkbox" class="ignorepunct-cb"> Ignore Punctuation</label>
          </div>
          <div class="normalizersDiv">
          
</div>
            <div class="preset-buttons-div">
         <b>Preset</b>: <span class="preset-title">--- [ none ] ---</span>
            <button type="button" class="btn btn-default btn-xs edit-preset-btn">
            Edit
            </button>

      <span class="edit-preset-div hidden">
            <input type="text" class="preset-input-text" value="--">
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

//  function arraysHaveTheSameValues(array1, array2) {
//   return array1.sort().join(' ') === array2.sort().join(' ')
// }