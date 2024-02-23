import {OptionsChecker} from "@thomas-inst/optionschecker";
import {urlGen} from "../pages/common/SiteUrlGen";
import {TagEditor} from "../widgets/TagEditor";
import {ConfirmDialog} from "../pages/common/ConfirmDialog";

export class MetadataEditor {

  constructor(options) {

    const optionsDefinition = {
      containerSelector: { type:'string', required: true},
      entityId: {type:'string', required: true},
      entityType: {type:'string', required: true},
      metadata: {type:'object', required: false, default: {values: [], notes: []}},
      metadataSchema: {type: 'object', required: true},
      mode: {type:'string', required: true},
      callback: {type:'function', required: true},
      theme: {type:'string', required: true},
      backlink: {type:'string', required: false, default: ''},
      dialog: {type: 'object', required: false, default: {}},
      dialogRootMetadataEditor: {type: 'object', required: false, default: {}},
      dialogRootInputFormSelector: {type:'string', required: false, default: ''},
    }

    const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "MetadataEditor"})
    this.options = oc.getCleanOptions(options)

    // fill container with the html structure of the metadata editor
    this.makeHtmlStructureForMetadataEditor()

    // globals
    this.entity = {id: '', type: '', keys: [], values: [], types: [], notes: []} // this object gets always updated with the latest metadata
    this.numKeys = 0
    this.mode = {create: 'create', edit: 'edit', show: 'show', dialog: 'dialog'}
    this.tagEditor = undefined
    this.singleEditingActive = false
    this.people = []

    // selectors
    this.buttonsSelectorTop = `${this.options.containerSelector} .buttons_top`
    this.buttonsSelectorBottom = `${this.options.containerSelector} .buttons_bottom`
    this.datalistSelector = this.options.containerSelector + " #people-datalist"

    // get a list of all people (for having the possibility of choosing entities as values, saving their ids, showing their names)
    // and set up the metadata editor in the desired mode
    this.getPeople().then( () => {
      let setupPromise;
      switch (this.options.mode) {
        case this.mode.edit:
          setupPromise = this.setupEditMode()
          break
        case this.mode.create:
          setupPromise = this.setupCreateMode();
          break
        case this.mode.show:
          setupPromise = this.setupShowMode()
          break
        case this.mode.dialog:
          setupPromise = this.setupDialogMode()
          break
      }
      setupPromise.then( () => {
        console.log("MetadataEditor initialized");
      })
    });
  }

  // Editor Setup
  makeHtmlStructureForMetadataEditor() {

    // define tableClass depending on the desired theme
    let tableClass
    switch (this.options.theme) {
      case 'vertical':
        tableClass = 'table'
        break
      case 'horizontal':
        tableClass = 'dataTable'
        break
    }

    this.metadataTableSelector = `${this.options.containerSelector} .metadataTable`;

    $(this.options.containerSelector).html(
      `<br>
                            <div class="buttons_top" align="right"></div>
                            <br>
                            <table class='${tableClass} metadataTable' style="table-layout:fixed;">
                            </table>
                            <div class="buttons_bottom" align="left"></div>
                            <div class="errorMessage" style="font-style: oblique"></div>
                            <br>`)
  }

  async setupEditMode() {
    this.options.mode = this.mode.edit
    await this.buildEntity();
    this.makeTableStructure()
    this.setupTableForUserInput();
    this.setupCancelButton();
    this.setupSaveButton();
    console.log(`edit-mode for metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} activated.`)
  }

  async setupCreateMode() {
    this.options.mode = this.mode.create
    await this.buildEntitySchema();
    this.makeTableStructure()
    this.setupTableForUserInput();
    this.setupSaveButton()
    this.makeBackButton()
    console.log(`create-mode for new entity of type '${this.entity.type}' activated.`)
  }

  async setupShowMode() {
    this.options.mode = this.mode.show
    this.removeSpinner()
    await this.buildEntity();
    this.makeTableStructure()
    this.setupBackAndEditButton()
    this.showMetadata()
    console.log(`show-mode for metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} activated.`)
  }

  async setupDialogMode() {
    this.options.mode = this.mode.dialog
    await this.buildEntitySchema();
    this.makeTableStructure()
    this.setupSaveButton()
    this.setupTableForUserInput();
    console.log(`create-mode for new entity of type '${this.entity.type}' activated.`);
  }

  // Entity and Table Management

  // updates the empty object this.entity with the data from this.options when instantiating a new metadata editor
  async buildEntity() {
    if (this.entity.id === '') {
      this.entity.id = this.options.entityId
    }
    this.entity.type = this.options.entityType
    if (this.entity.values.length === 0) { // After having edited and saved values and notes, they get updated via the updateEntityData function
      this.entity.values = this.options.metadata.values
      this.entity.notes = this.options.metadata.notes
    }
    this.entity.keys = this.options.metadataSchema.keys
    this.entity.types = this.options.metadataSchema.types

    // store number of keys of the entity
    this.numKeys = this.entity.keys.length
  }

  // updates the empty object this.entity with the data-schema from this.options when creating a new entity
  async buildEntitySchema() {
      this.entity.id = this.options.entityId
      this.entity.type = this.options.entityType
      this.entity.keys = this.options.metadataSchema.keys
      this.entity.types = this.options.metadataSchema.types

      // store number of values
      this.numKeys = this.entity.keys.length
  }

  getValueByKeyFromEntity(key) {
    let i = this.entity.keys.indexOf(key)
    return this.entity.values[i]
  }

  getPersonNameByIdFromPeople (id) {

    for (let person of this.people) {
      if (person.id === id) {
        return person.values[0]
      }
    }
    console.log(this.people)
    this.returnError('error in people list')
    //return this.people[id].values[0]
  }

  getNamesOfAllThePeople () {
    let names = []

    for (let person of this.people) {
      names.push(person.values[0])
    }

    return names
  }

  updatePeople(id, name) {
    this.people.push({id: id, values: [name]})
    return true
  }

  // Table Design Management
  makeTableStructure() {
    this.clearTable()
    this.makeTableRows()
    this.makeTableCells()
  }

  makeTableRows() {
    switch (this.options.theme) {
      case 'horizontal':
        $(this.metadataTableSelector).append(`<tr class="row1"></tr><tr class="row2"></tr>`)
        break
      case 'vertical':
        for (let i=1; i<=this.numKeys; i++) {
          let className = "row" + i
          $(this.metadataTableSelector).append(`<tr class=${className}></tr>`)
        }
        break
    }
  }

  makeTableCells () {
    switch (this.options.theme) {
      case 'horizontal':
        for (let i = 1; i <= this.numKeys; i++) {

          let cellId = "entity_attr" + i

          if (this.options.mode === this.mode.show) {
            let cellButtonsAndIconsId = cellId + "_tableCellButton"
            let editAttributeButton = "entity_attr" + i + "_editButton"
            $(`${this.options.containerSelector} .row1`).append(`<th>${this.entity.keys[i-1]}</th><th></th>`)
            $(`${this.options.containerSelector} .row2`).append(`<td><div class=${cellId}></div></td>
                                                <td class=${cellButtonsAndIconsId} style="width: 3em; text-align: center">
                                                    <button class=${editAttributeButton} style="border: transparent; background-color: transparent">
                                                        <i class="fas fa-pencil-alt" style="color: dimgray"></i></button>
                                                </td>`)
            this.makeEditIconEvent(editAttributeButton)
          } else {
            $(`${this.options.containerSelector} .row1`).append(`<th>${this.entity.keys[i-1]}</th>`)
            $(`${this.options.containerSelector} .row2`).append(`<td><div class=${cellId}></div></td>`)
          }
        }
        break
      case 'vertical':
        for (let i = 1; i <= this.numKeys; i++) {

          let row = this.options.containerSelector + " .row" + i
          let cellId = "entity_attr" + i
          let editAttributeButton = "entity_attr" + i + "_editButton"
          let keyName = this.entity.keys[i-1] + "&emsp;&emsp;"

          if (this.options.mode !== this.mode.show) {
            $(row).append(`<th style="vertical-align: top">${keyName}</th>
                                    <td><div class=${cellId}></div></td>`)
          } else {
            let cellButtonsAndIconsId = cellId + "_tableCellButton"
            $(row).append(`<th style="vertical-align: top">${keyName}</th>
                                    <td><div class=${cellId}></div></td>
                                    <td class=${cellButtonsAndIconsId} style="width: 4.75em; text-align: right">
                                        <button class=${editAttributeButton} style="border: transparent; background-color: transparent"><i class="fas fa-pencil-alt" style="color: dimgray"></i></button>
                                    </td>`)
            this.makeEditIconEvent(editAttributeButton)
          }
        }
        break
    }
  }

  makeSpinner(container, size='2em') {
    $(container).html(`<div class="spinner-border" role="status" id="spinner" style="color: dodgerblue; margin-top: 0.7em; width: ${size}; height: ${size}"></div>`)
  }

  removeSpinner() {
    $('#spinner').remove()
  }

  clearTableCells() {
    for (let i=1; i<=this.numKeys; i++) {
      let id = "#entity_attr" + i
      $(id).empty()
    }
  }

  clearTable() {
    $(this.metadataTableSelector).empty()
  }

  // Table Data Management
  showMetadata() {

    this.clearTableCells()
    this.removeSpinner()

    for (let i = 1; i <= this.numKeys; i++) {
      let selector = this.options.containerSelector + " .entity_attr" + i
      let value = this.entity.values[i - 1]
      let type = this.entity.types[i - 1]
      let note = this.entity.notes[i - 1]

      if (type.includes('person') && value !== '') {
        let url = urlGen.sitePerson(value)
        let linkId = "linktoperson" + value
        let name = this.getPersonNameByIdFromPeople(value)
        value = `<a id=${linkId} href=${url} >${name}</a>`
        $(selector).append(value)

      } else if (type.includes('years_range')) {
        value = this.formatYearForShowModesRangeForShowMode(value)
        $(selector).append(value)

      } else if (type.includes('year')) {
        value = this.formatYearForShowMode(value)
        $(selector).append(value)

      } else if (type.includes('tags')) {
        let tagEditorId = 'tag-editor-' + (1 + Math.floor(Math.random() * 10000))
        this.tagEditor = new TagEditor({
          containerSelector: selector,
          idPrefix: tagEditorId,
          tags: value,
          mode: 'show'
        })
      } else if (type.includes('date')) {
        value = this.formatDateForShowMode(value)
        $(selector).append(value)

      } else if (type.includes('url')) {
        let extLink = 'http://' + value
        value = `<a target="_blank" href=${extLink}>${value}</a>`
        $(selector).append(value)
      } else {
        $(selector).append(value)
      }

      //  add info icon to input field if not a tag field
      if (note.replaceAll(' ', '') !== '' && !type.includes('tags')) {
        let cellButtonsAndIconsSelector = this.options.containerSelector + " .entity_attr" + i + "_tableCellButton"
        $(cellButtonsAndIconsSelector).prepend(`<span title="${note}"><i class="fa fa-info-circle" aria-hidden="true" style="color: green; text-align: right"></i></span>`)
      }
    }
  }


  formatYearForShowModesRangeForShowMode(y) {
    if (y[0] === "") {
      y = ""
    } else if (y[1] === "" && y[2] === "") {
      y = y[0]
    } else if (y[1] !== "" && y[2] === "") {
      y = y[0] + "-" + y[1]
    } else if (y[1] === "" && y[2] !== "") {
      y = y[0] + " (" + y[2] + ")"
    } else {
      y = y[0] + "-" + y[1] + " (" + y[2] + ")"
    }

    return y
  }

  formatYearForShowMode(y) {
    if (y[0] !== '') {
      y = y[0] + " " + y[1]
    }
    else {
      y = ''
    }
    return y
  }

  formatDateForShowMode(d) {
    if (d !== '') {
      let nums = d.split('-')
      while (nums[0][0] === '0') {
        nums[0] = nums[0].slice(1)
      }
      return nums[2] + '.' + nums[1] + '.' + nums[0]
    } else {
      return d
    }
  }

  setupTableForUserInput(keyIndex='all') {

    this.setupInputFormByIndex(keyIndex)

    if (this.options.mode === this.mode.create || this.options.mode === this.mode.dialog) {

    }
    else {
      this.addValueToInputFormByIndex(keyIndex)
    }
  }

  setupInputFormByIndex(keyIndex) {
    if (keyIndex === 'all') {
      for (let i = 1; i <= this.numKeys; i++) {
        let selectorId = this.options.containerSelector + " .entity_attr" + i
        let inputFormId = "entity_attr" + i + "_form"
        let type = this.entity.types[i-1][0] // first possible type of data, set in the corresponding schema, determines type of input form

        this.setupInputFormByType(type, selectorId, inputFormId)
      }
    } else {
      let selectorId = this.options.containerSelector + " .entity_attr" + keyIndex
      let inputFormId = "entity_attr" + keyIndex + "_form"
      let type = this.entity.types[keyIndex-1][0] // first possible type of data, set in the corresponding schema, determines type of input form

      this.setupInputFormByType(type, selectorId, inputFormId)
    }
  }

  setupInputFormByType(type, selectorId, inputFormId) {
    switch (type) {
      case 'password':
        this.makePasswordInputForm(selectorId, inputFormId)
        break
      case 'date':
        this.makeDateInputForm(selectorId, inputFormId, type)
        break
      case 'year':
        this.makeYearInputForm(selectorId, inputFormId, type)
        break
      case 'years_range':
        this.makeYearsRangeInputForm(selectorId, inputFormId)
        break
      case 'person':
        this.makePersonInputForm(selectorId, inputFormId)
        break
      case 'tags':
        this.makeTagsInputForm(selectorId)
        break
      default:
        this.makeTextInputForm(selectorId, inputFormId, type)
    }

    // make note field
    this.makeHiddenNoteTextArea(inputFormId, selectorId)
    this.makeShowAndHideInfoEvents(selectorId, inputFormId)

    this.focusIfFirstInputForm(inputFormId)
  }

  makeHiddenNoteTextArea(inputFormId, selectorId) {
    let noteId = inputFormId + '_info-note'
    $(selectorId).append(`<textarea class="${noteId} form-control" rows="2" placeholder="info" style="font-size: small"></textarea>`)
    let noteSelector = this.options.containerSelector+" ."+noteId
    $(noteSelector).hide()
    $(noteSelector).on('focusout', () => {
      if ($(noteSelector).val().replaceAll(' ', '') === '') {
        $(noteSelector).hide()
      }
    })
  }

  makeTagsInputForm(selectorId) {
    let tagEditorId = 'tag-editor-' + (1 + Math.floor( Math.random() * 10000))
    this.tagEditor = new TagEditor({
      containerSelector: selectorId,
      idPrefix: tagEditorId,
      tags: this.getValueByKeyFromEntity('Tags'),
      mode: 'edit'
    })
    this.getTagHints((tagHints) => {
      this.tagEditor.setTagHints(tagHints)
    })
  }

  makePersonInputForm(selector, inputFormId) {
    let list = "people-datalist"
    let listSelector = '#' + list
    let paragraphId = inputFormId + '_paragraph'

    $(selector).html(`<p class='${paragraphId} embed-button'>
            <input class='${inputFormId} form-control' list=${list} placeholder="person" autoComplete="off" style="padding: unset">
                <datalist id=${list}></datalist></p>`)
    this.addNamesToDatalistForPersonsAsValues(this.people, listSelector)
    this.makePersonInputFormEvent(inputFormId, listSelector, paragraphId)
  }

  addNamesToDatalistForPersonsAsValues(people, listSelector) {

    let id = 0

    $(listSelector).empty()

    for (let person of people) {
      id = person.id
      let name = person.values[0]
      if (name !== undefined) {
        let nameForValueAttribute = name.replaceAll(' ', '_')
        $(listSelector).append(`<option value=${nameForValueAttribute} id=${id}>${name}</option>`)
      }
    }
  }

  makePersonInputFormEvent(inputFormId, listSelector, paragraphSelector) {

    let dialog = ''
    let buttonId = inputFormId + '_create-person-from-datalist-button'
    let buttonSelector = this.options.containerSelector + ' .' + buttonId
    inputFormId = this.options.containerSelector + ' .' + inputFormId
    paragraphSelector = this.options.containerSelector + ' .' + paragraphSelector

    if (!(this.options.mode === this.mode.dialog)) {
      dialog = this.makeDialog(inputFormId)
    } else {
      $(inputFormId).on('focus', () => {
        dialog = this.makeDialog(inputFormId)
      })
    }

    $(inputFormId).on('input', () => {
      let value = $(inputFormId).val()
      $(inputFormId).val(value.replaceAll('_', ' '))
      let valueForDatalist = value.replaceAll(' ', '_')
      $(buttonSelector).remove()
      if (value !== '') {
        if ($(`${listSelector} option[value=${valueForDatalist}]`).attr('id') === undefined) {
          $(paragraphSelector).append(`<button class=${buttonId}><i class="fa fa-plus" style="color: dodgerblue"></i></button>`)
          this.makeCreatePersonFromInputFormButtonEvent(buttonSelector, dialog, inputFormId)
        }
      }
    })
  }

  makeDialog(inputFormId) {
    let dialogBody = `<div class="personCreatorDialog" align="center"></div>`

    let dialog = new ConfirmDialog({
      size: 'xl',
      acceptButtonLabel: 'Save',
      body: dialogBody,
      metadataEditor: true,
      cancelFunction: () => {
        console.log(`Canceled person creation.`)
      },
      reuseDialog: true
    })

    let dialogSelector = dialog.getSelector()
    this.getPersonSchema((entity) => {
      this.setupMetadataEditorInDialogWindow(entity, `${dialogSelector} .personCreatorDialog`, dialog, inputFormId)
    })

    return dialog
  }

  makeCreatePersonFromInputFormButtonEvent (buttonSelector, dialog, inputFormId) {

    $(buttonSelector).on('click', () => {
      let firstInputFormInDialog = this.copyValueFromRootToDialog(inputFormId, dialog)
      dialog.show()
      $(firstInputFormInDialog).focus()
    })
  }

  copyValueFromRootToDialog(inputFormId, dialog) {
    let value = $(inputFormId).val()
    let dialogSelector = dialog.getSelector()
    $(`${dialogSelector} .entity_attr1_form`).val(value)
    return `${dialogSelector} .entity_attr1_form`
  }

  copyValueFromDialogToRootAndSave() {
    let value = $(`${this.options.containerSelector} .entity_attr1_form`).val()
    let buttonSelector = this.options.dialogRootInputFormSelector + '_create-person-from-datalist-button'
    $(this.options.dialogRootInputFormSelector).val(value)
    $(buttonSelector).remove()

    let keyIndex = this.options.dialogRootInputFormSelector.match(/\d+/)[0]
    let saveIcon = ".entity_attr" + keyIndex + "_saveButton"
    $(saveIcon).click();
  }

  updateDatalistInRootMetadataEditor () {
    let value = $(`${this.options.containerSelector} .entity_attr1_form`).val()
    let valueForDatalist = value.replaceAll(' ', '_')
    $(this.options.dialogRootMetadataEditor.datalistSelector).append(`<option value=${valueForDatalist} id=${this.people.length}>${value}</option>`)
  }

  setupMetadataEditorInDialogWindow (entity, selector, dialog, inputFormId) {

    let mde = new MetadataEditor({
      containerSelector: selector,
      entityId: entity.id,
      entityType: entity.type,
      metadata: entity.values,
      metadataSchema: {keys: entity.keys, types: entity.types},
      callback: (data, mode, callback) => {
        this.savePersonData(data, mode, callback)
      },
      mode: 'dialog',
      theme: 'vertical',
      dialog: dialog,
      dialogRootMetadataEditor: this,
      dialogRootInputFormSelector: inputFormId,
    })
  }

  makePasswordInputForm(selector, inputFormId) {

    this.password1Selector = this.options.containerSelector + " ." + inputFormId
    this.password2Selector = this.options.containerSelector + " .password2"

    $(selector).html(
      `<form data-toggle="validator" role="form" id="theChangePasswordForm">
        <!-- Password -->
        <div class="form-group has-feedback">
            <input type="password" 
               class="${inputFormId} form-control"
               name="password1"
               data-minlength="8"
               maxlength="16"
               placeholder="Password (8-16 characters)" required>
            <div class="help-block with-errors"></div>
        <!-- Password confirmation -->
            <input type="password" 
                   class="password2 form-control" 
                   name="password2"
                   data-match=${this.password1Selector}
                   data-match-error="Passwords do not match"
                   placeholder="Confirm" required>
            <div class="help-block with-errors"></div>
        </div></form>`)
  }

  makeDateInputForm(selectorId, inputFormId, type) {
    $(selectorId).html(`<p class="embed-button"><input type="date" class="${inputFormId} form-control" placeholder=${type} style="padding: unset"></p>`)
  }

  makeYearInputForm(selectorId, inputFormId, type) {
    let inputFormIdBcAd = inputFormId + "_" + "year_bc_ad"
    let inputFormIdBcADSelector = this.options.containerSelector + " ." + inputFormIdBcAd

    $(selectorId).html(`<p class="embed-button"><input type="text" class="${inputFormId} form-control" placeholder=${type} style="padding: unset">
                                                                    <select class="${inputFormIdBcAd} form-control" style="padding: unset"></p>`)
    $(inputFormIdBcADSelector).append(`<option>BC</option><option selected>AD</option>`)
  }

  makeYearsRangeInputForm(selectorId, inputFormId) {

    let idYearsRangeEnd = inputFormId + "_years_range_end"
    let idYearsRangeNote = inputFormId + "_years_range_note"
    let currentYear = new Date().getFullYear()

    $(selectorId).html(`<select class="${inputFormId} form-control" style="padding: unset">`)
    $(selectorId).append(`<p><select class="${idYearsRangeEnd} form-control" style="padding: unset"></p>`)
    $(selectorId).append(`<p><textarea class="${idYearsRangeNote} form-control" rows="2" placeholder="note"></textarea></p>`)

    let selectorYearsRangeStart = this.options.containerSelector + " ." + inputFormId
    let selectorYearsRangeEnd = this.options.containerSelector + " ." + idYearsRangeEnd

    $(selectorYearsRangeStart).append(`<option></option>`)
    $(selectorYearsRangeEnd).append(`<option></option>`)

    for (let i=-1000; i<=currentYear; i++) {
      $(selectorYearsRangeStart).append(`<option>${i}</option>`)
      $(selectorYearsRangeEnd).append(`<option>${i}</option>`)
    }
  }

  makeTextInputForm(selectorId, inputFormId, type) {
    $(selectorId).html(
      `<p class="embed-button"><input type="text" class="${inputFormId} form-control" placeholder=${type} style="padding: unset"></p>`)
  }

  makeShowAndHideInfoEvents(selectorId, inputFormId) {
    let buttonId = inputFormId + '_info-note-button'
    let buttonSelector = this.options.containerSelector+ " ." + buttonId
    let noteId = inputFormId + '_info-note'
    let noteSelector = this.options.containerSelector+ " ." + noteId

    $(this.options.containerSelector + " ." + inputFormId).on("focusin", () => {
      if ($(noteSelector).is(":hidden")) {
        this.makeInfoIconWithEvent(selectorId, buttonId, buttonSelector, noteSelector)
      }
    })
    $(this.options.containerSelector + " ." + inputFormId).on("focusout", () => {
      this.removeInfoIcon(buttonSelector, 200)
    })
  }

  makeInfoIconWithEvent(selectorId, buttonId, buttonSelector, noteSelector) {
    $(selectorId + " .embed-button").append(`<button class=${buttonId} tabindex="32767"><i class="fa fa-info-circle" aria-hidden="true" style="color: cornflowerblue"></button>`)
    $(buttonSelector).on("click", () => {
      $(noteSelector).show()
      $(noteSelector).focus()
      this.removeInfoIcon(buttonSelector, 0)
    })
  }

  removeInfoIcon(buttonSelector, timeout) {
    // 50 milliseconds delay, otherwise the button would be removed before the button event could    be triggered
    setTimeout(() => {
      $(buttonSelector).remove()
    }, timeout);
  }

  focusIfFirstInputForm(inputForm) {
    if (inputForm.match(/\d+/)[0] === '1') {
      let firstInputFormSelector = this.options.containerSelector + " ." + inputForm
      $(firstInputFormSelector).focus()
    }
  }

  addValueToInputFormByIndex(keyIndex) {
    if (keyIndex === 'all') {
      for (let i=1; i<=this.numKeys; i++) {
        this.addValueToInputFormByType(this.entity.types[i-1][0], i)
      }
    } else {
      this.addValueToInputFormByType(this.entity.types[keyIndex-1][0], keyIndex)
    }
  }

  addValueToInputFormByType(type, index) {

    let values = this.entity.values
    let notes = this.entity.notes
    let entityAttrFormId = this.options.containerSelector + " .entity_attr" + index + "_form"
    let entityAttrNoteId = this.options.containerSelector + " .entity_attr" + index + "_form_info-note"

    switch (type) {
      case 'year':
        let idYearBcAd = entityAttrFormId + "_year_bc_ad"
        $(entityAttrFormId).val(values[index-1][0])
        $(idYearBcAd).val(values[index-1][1])
        break
      case 'years_range':
        let idYearsRangeEnd = entityAttrFormId + "_years_range_end"
        let idYearsRangeNote = entityAttrFormId + "_years_range_note"
        $(entityAttrFormId).val(values[index-1][0])
        $(idYearsRangeEnd).val(values[index-1][1])
        $(idYearsRangeNote).val(values[index-1][2])
        break
      case 'person':
        if (values[index-1] !== '') {
          let name = this.getPersonNameByIdFromPeople(values[index-1])
          $(entityAttrFormId).val(name)
        }
        break
      default:
        $(entityAttrFormId).val(values[index-1])
    }

    if (notes[index-1].replaceAll(' ', '') !== '') {
      $(entityAttrNoteId).val(notes[index-1])
      $(entityAttrNoteId).show()
      let buttonId = "entity_attr" + index + "_form" + '_info-note-button'
      this.removeInfoIcon(buttonId, 0)
    }
  }

  // Button Setup
  setupSaveButton () {
    this.clearBottomButtons()
    $(this.buttonsSelectorBottom).prepend(
      `<button type="submit" class="save-button btn btn-primary save">Save</button>`)
    this.makeSaveButtonEvent()
  }

  setupBackAndEditButton() {
    this.clearTopButtons()
    this.makeEditButton()
    this.insertSpaceBetweenButtons()
    this.makeBackButton()
  }

  setupCancelButton() {
    this.clearTopButtons()
    this.makeCancelButton()
  }

  insertSpaceBetweenButtons() {
    $(this.buttonsSelectorTop).append(' ')
  }

  makeEditButton(){
    $(this.buttonsSelectorTop).append(
      `<a class='edit_button card-link'>Edit</a>`)
    this.makeEditButtonEvent()
  }

  makeCancelButton(){
    $(this.buttonsSelectorTop).append(
      `<a class="cancel_button card-link">Cancel</a>`)
    this.makeCancelButtonEvent()
  }

  makeBackButton() {
    if (this.options.backlink !== '') {
      $(this.buttonsSelectorTop).append(
        `<a class="back_button card-link" href = ${this.options.backlink}>Back</a>`)
    }
  }

  clearTopButtons() {
    $(this.buttonsSelectorTop).empty()
  }

  clearBottomButtons() {
    $(this.buttonsSelectorBottom).empty()
  }

  makeSaveButtonEvent () {
    $(`${this.options.containerSelector} .save-button`).on("click",  () => {

      // Clear Messages
      this.clearErrorMessage()

      // get data to save
      this.updateDatalistInRootMetadataEditor()
      let d = this.getEntityDataByIndexFromInputForm()

      // validate and save data, execute the callback-function given in the options, check if working in dialog window
      if (this.validateData(d) && this.validatePasswords()) {
        this.makeSpinner(this.buttonsSelectorBottom)
        this.updateEntityData(d.id, d.type, d.values, d.notes)
        this.saveTagsAsHints(this.tagEditor.getTags())
        this.options.callback(this.entity, this.options.mode, () => {
          this.logSaveAction(this.options.mode)
          if (this.options.mode === this.mode.dialog) {
            this.copyValueFromDialogToRootAndSave()
            this.options.dialog.hide()
            this.options.dialog.destroy()
            this.options.dialogRootMetadataEditor.updatePeople(this.entity.id, d.values[0])
          } else {
            this.setupShowMode()
          }
        })
      }
    })
  }

  makeEditIconEvent(selector) {
    selector = this.options.containerSelector + ' .' + selector
    $(selector).on("click", () => {
      if (!this.singleEditingActive) {
        let keyIndex = selector.match(/\d+/)[0]
        let inputForm = this.options.containerSelector + " .entity_attr" + keyIndex + "_form"
        this.setupTableForUserInput(() => {
          this.replaceEditWithSaveAndAbortIcons(keyIndex)
          $(inputForm).focus()
          if (this.tagEditor !== undefined) {
            this.tagEditor.focus()
          }
          console.log(`'${this.entity.keys[keyIndex-1]}' in edit mode!`)
        }, keyIndex)
        this.options.mode = this.mode.edit
        this.singleEditingActive = true
        this.mutePencilAndInfoIcons(keyIndex)
      }
    })
  }

  mutePencilAndInfoIcons(keyIndex) {
    for (let i=1; i<=this.numKeys; i++) {
      let selector = this.options.containerSelector + " .entity_attr" + i + "_tableCellButton"
      if (i !== parseInt(keyIndex)) {
        $(selector+" .fa").css("color", "lightgray"); // make info-icons light-gray
        $(selector+" .fas").css("color", "lightgray"); // make pencils light-gray
      }
    }
  }

  replaceEditWithSaveAndAbortIcons(i) {
    let cellButtonSelector = this.options.containerSelector + " .entity_attr" + i + "_tableCellButton"
    let editButtonSelector = this.options.containerSelector + ' .entity_attr' + i + '_editButton'
    let cellSaveButton = "entity_attr" + i + "_saveButton"
    let cellAbortButton = "entity_attr" + i + "_abortButton"

    $(editButtonSelector).remove()
    $(cellButtonSelector).html(`<button class="save ${cellSaveButton}" style="border: transparent; background-color: transparent">
                                                    <i class="fa fa-check" style="color: green"></i></button>`)
    $(cellButtonSelector).append(`<br><button class="abort ${cellAbortButton}" style="border: transparent; background-color: transparent">
                                                    <i class="fa fa-times" style="color: darkred; margin-right: 0.15em"></i></button>`)
    this.makeSaveIconEvent(cellSaveButton)
    this.makeAbortIconEvent(cellAbortButton)
  }

  makeAbortIconEvent(selector) {
    selector = this.options.containerSelector + ' .' + selector
    $(selector).on("click",  () => {
      this.singleEditingActive = false
      let keyIndex = selector.match(/\d+/)[0]
      this.clearErrorMessage()
      this.setupShowMode()
      console.log(`Editing value for '${this.entity.keys[keyIndex-1]}' aborted.`)
    })
  }

  makeSaveIconEvent(selector) {
    selector = this.options.containerSelector + ' .' + selector
    $(selector).on("click",  () => {
      let keyIndex = selector.match(/\d+/)[0]
      let cellButtonsAndIconsId = "entity_attr" + keyIndex + "_tableCellButton"
      let cellButtonsAndIconsSelector = this.options.containerSelector + ' .' + cellButtonsAndIconsId
      let value = this.getEntityDataByIndexFromInputForm(keyIndex)['value']
      let note = this.getEntityDataByIndexFromInputForm(keyIndex)['note']
      if (this.validateData(value, keyIndex)) {
        this.clearErrorMessage()
        this.makeSpinner(cellButtonsAndIconsSelector, '1.25em')
        if (this.entity.types[keyIndex-1].includes('tags')) {
          this.saveTagsAsHints(value)
        }
        this.entity.values[keyIndex-1] = value // Corresponds to updateEntityData function in global save event
        this.entity.notes[keyIndex-1] = note // Corresponds to updateEntityData function in global save event
        this.options.callback(this.entity, this.options.mode, () => {
          this.logSaveAction(this.options.mode)
          this.singleEditingActive = false
          this.setupShowMode()
        })
        console.log(`Saved value for '${this.entity.keys[keyIndex-1]}'.`)
      }
    })
  }

  makeEditButtonEvent() {
    $(`${this.options.containerSelector} .edit_button`).on("click",  () => {

      this.options.mode = this.mode.edit

      // Clear Messages
      this.clearErrorMessage()
      this.setupEditMode()
    })
  }

  makeCancelButtonEvent() {
    $(`${this.options.containerSelector} .cancel_button`).on("click",  () => {

      this.options.mode = this.mode.show

      // Clear Messages
      this.clearErrorMessage()
      this.clearBottomButtons()
      this.setupShowMode()
    })
  }

  updateEntityData(id, type, values, notes) {
    this.entity.id = id
    this.entity.type = type
    this.entity.values = values
    this.entity.notes = notes
  }

  getEntityDataByIndexFromInputForm(keyIndex='all') {
    let id = this.entity.id
    let values = []
    let notes = []
    let type = this.entity.type

    if (keyIndex === 'all') {
      for (let i = 1; i <= this.numKeys; i++) {
        let valueAndNote = this.getEntityDataByTypeFromInputForm(this.entity.types[i-1], i)
        values.push(valueAndNote['value'])
        notes.push(valueAndNote['note'])
      }
      return {id: id, type: type, values: values, notes: notes}
    } else {
      return this.getEntityDataByTypeFromInputForm(this.entity.types[keyIndex-1], keyIndex)
    }
  }

  getEntityDataByTypeFromInputForm (type, keyIndex) {

    let selector = this.options.containerSelector + " .entity_attr" + keyIndex + "_form"
    let value = $(selector).val()
    let noteSelector = this.options.containerSelector + " .entity_attr" + keyIndex + "_form_info-note"
    let note = $(noteSelector).val()
    if (note === undefined) {note = ''}

    if (type.includes('year')) {
      return {
        'value': this.getDataForYearFromInputForm(selector, value),
        'note': note
      }

    } else if (type.includes('years_range')) {
      return {
        'value': this.getDataForYearsRangeFromInputForm(selector, value),
        'note': note
      }

    } else if (type.includes('tags')) {
      return {
        'value': this.tagEditor.getTags(),
        'note': ''
      }

    } else if (type.includes('person')) {
      let person_id
      try { // get person id for given person name, therefore remove blanks, which are not contained in the datalist values
        let valueForDatalist = value.replaceAll(' ', '_')
        person_id = $(`${this.datalistSelector} option[value=${valueForDatalist}]`).attr('id')
      } catch {
        person_id = ''
      }
      return {
        'value': person_id,
        'note': note
      }

    } else {
      return {
        'value':value,
        'note': note
      }
    }
  }

  getDataForYearsRangeFromInputForm(name, value) {
    let years = []
    let idYearsRangeEnd = name + "_years_range_end"
    let idYearsRangeNote = name + "_years_range_note"

    years.push(value)
    years.push($(idYearsRangeEnd).val())
    years.push($(idYearsRangeNote).val())

    return years
  }

  getDataForYearFromInputForm(name, value) {
    let year = []
    name = name + "_year_bc_ad"
    year.push(value)
    year.push($(name).val())
    return year
  }

  // Validate Data
  validateData (d, keyIndex='all') {

    let index = 0

    if (keyIndex === 'all') { // full edit
      for (let value of d.values) {

        let key = this.entity.keys[index]
        let affordedTypes = this.entity.types[index]

        if (!affordedTypes.includes('password') && !this.isValid(key, affordedTypes, this.dataType(value), value)) { // Passwords do not need to undergo a check here
          return false
        } else {
          index++
        }
      }
    } else { // single edit

      let key = this.entity.keys[keyIndex-1]
      let affordedTypes = this.entity.types[keyIndex-1]
      let value = d

      if (!affordedTypes.includes('password') && !this.isValid(key, affordedTypes, this.dataType(value), value)) { // Passwords do not need to undergo a check here
        return false
      }
    }
    return true
  }

  isValid(key, affordedTypes, givenType, value) {
    if (this.typesNotMatching(givenType, affordedTypes) || value === undefined) {
      this.returnDataTypeError(key, givenType, affordedTypes)
      return false
    } else if (this.inconsistentDates(key, givenType, value)) {
      this.returnImpossibleDatesError()
      return false
    } else if (this.inconsistentYearsRange(affordedTypes, value)) {
      this.returnImpossibleYearsRangeError(key)
      return false
    } else if (this.nameIsDuplicate(key, givenType, value)) {
      this.returnDuplicateInNameError(value)
    } else {
      return true
    }
  }

  nameIsDuplicate (key, givenType, value) {
    let names = this.getNamesOfAllThePeople()
    return givenType === 'text' && names.includes(value) && value !== this.entity.values[0]
  }

  typesNotMatching (givenType, affordedTypes) {
    return affordedTypes.includes(givenType) === false && !(affordedTypes.includes('person') && givenType === 'number')
  }

  inconsistentDates(key, givenType, value) {

    if (givenType !== 'date') {
      return false
    } else {
      let date_birth = '0'
      let date_death = 'z'

      // get dates of birth and death
      if (key === 'Date of Birth' && value !== '' && this.getValueByKeyFromEntity('Date of Death') !== '') {
        date_birth = value
        date_death = this.getValueByKeyFromEntity('Date of Death')
      }
      if (key === 'Date of Death' && value !== '' && this.getValueByKeyFromEntity('Date of Birth') !== '') {
        date_death = value
        date_birth = this.getValueByKeyFromEntity('Date of Birth')
      }
      return date_birth > date_death
    }
  }

  inconsistentYearsRange(affordedTypes, value) {
    return affordedTypes.includes('years_range') &&
      (parseInt(value[0]) > parseInt(value[1]) || (value[0] === '' && value[1] !== '') || (value[0] === '' && value[2] !== ''))
  }

  validatePasswords() {
    if ($(this.password1Selector).val() === $(this.password2Selector).val() && $(this.password1Selector).val() !== "") {
      return true
    }
    else {
      this.returnPasswordError()
      return false
    }
  }

  dataType(value) {

    let type

    if (value === undefined) {
      type = value
    }
    else if (Array.isArray(value)) {
      if (this.isYearsRange(value)) {
        type = 'years_range'
      }
      else if (this.isYear(value)) {
        type = 'year'
      }
      else if (this.isIncorrectYear(value)) {
        type = this.dataType(value[0])
      }
      else if (this.isEmptyArray(value)) {
        type = 'empty'
      } else {
        type = 'tags'
      }
    }
    else if (this.isMail(value)) {
      type = 'email'
    }
    else if (this.isUrl(value)) {
      type = 'url'
    }
    else if (this.containsNumber(value)) {

      if (this.containsOnlyNumbers(value)) {
        type = 'number'
      }
      else if (this.isDate(value)) {
        type = 'date'
      }
      else {
        type = 'mixed'
      }
    }
    else if (value === "") {
      type = 'empty'
    }
    else {
      type = 'text'
    }

    return type
  }

  isEmptyArray(array) {
    if (array === []) {
      return true
    } else {
      for (let value of array) {
        if (value !== '') {
          return false
        }
      }
    }
    return true
  }

  isYearsRange(array) {
    return array.length === 3 && array[0] !== "" && this.containsOnlyNumbers(array[0])
  }

  isYear(array) {
    return array.length === 2 && array[0] !== "" && this.containsOnlyNumbers(array[0])
  }

  isIncorrectYear(value) {
    return value.length === 2 && value[1] === 'BC' || value[1] === 'AD'
  }

  isMail(str) {
    return /.+@.+\..+/.test(str)
  }

  isUrl(str) {
    return /www\..+\..+/.test(str)
  }

  containsNumber(str) {
    return /\d/.test(str);
  }

  containsOnlyNumbers(str) {
    return /^\d+$/.test(str);
  }

  isDate(str) {
    return /.+-.+-.+/.test(str)
  }

  // Error Communication and Logging
  returnDataTypeError(key, givenType, affordedTypes) {
    console.log(`Data Type Error! Given data for '${key}' is of type '${givenType}' but has to be of one of the types '${affordedTypes}'. Please try again.`)
    this.returnError(`Error! Given data for '${key}' is of type '${givenType}' but has to be of one of the types '${affordedTypes}'. Please try again.`)
  }

  returnImpossibleDatesError() {
    console.log('Impossible Dates Error!')
    this.returnError(`Error! Given date for 'Date of Birth' is after given date for 'Date of Death'. Please try again.`)
  }

  returnImpossibleYearsRangeError(key) {
    console.log('Impossible Years Range Error!')
    this.returnError(`Error! Given data for '${key}' are inconsistent. Please try again.`)
  }

  returnPasswordError() {
    console.log('Password Error!')
    this.returnError(`Password Error! Please try again.`)
  }

  returnDuplicateInNameError (value) {
    let names = this.getNamesOfAllThePeople()
    let personId = names.indexOf(value)
    let url = urlGen.sitePerson(personId)
    let linkId = "linktoperson" + personId
    let link = `<a id=${linkId} href=${url} >${value}</a>`

    console.log('Duplicate in Name Error!')
    this.returnError(`Error! Person with display name '${link}' already exists. Please try again.`)
  }

  returnError(str) {
    str = "&nbsp&nbsp" + str
    $(`${this.options.containerSelector} .errorMessage`).html(str)
  }

  clearErrorMessage() {
    $(`${this.options.containerSelector} .errorMessage`).empty()
  }

  logSaveAction(mode) {
    if (mode === this.mode.edit) {
      console.log(`Saved alterations of entity with ID ${this.entity.id}.`)
    }
    else if (mode === this.mode.create || mode === this.mode.dialog) {
      console.log(`Created new entity of type '${this.entity.type}' with ID ${this.entity.id}.`)
    }
  }

  // API Calls
  getPeople() {
    return new Promise ( (resolve, reject) => {
      $.post(urlGen.apiPeopleGetAllPeople())
        .done((apiResponse) => {

          // Catch Error
          if (apiResponse.status !== 'OK') {
            console.log(`Error in query`);
            if (apiResponse.errorData !== undefined) {
              console.log(apiResponse.errorData);
            }
            return false
          }
          else {
            console.log(apiResponse)
            this.people = apiResponse.data
            resolve()
          }
        })
        .fail((status) => {
          console.log(status);
          reject();
        })
    })


  }

  getPersonSchema (setupMetadataEditor) {
    // Make API Call
    $.post(urlGen.apiPeopleGetSchema())
      .done((apiResponse) => {

        // Catch Error
        if (apiResponse.status !== 'OK') {
          console.log(`Error in query`);
          if (apiResponse.errorData !== undefined) {
            console.log(apiResponse.errorData);
          }
          return false
        }
        else {
          console.log(apiResponse)
          setupMetadataEditor(apiResponse.data)
          return true
        }

      })
      .fail((status) => {
        console.log(status);
        return false
      })
  }

  savePersonData (data, mode, callback) {

    this.getIdForNewPerson(data, (newData) => {
      // Make API Call
      $.post(urlGen.apiPeopleSaveData(), newData)
        .done((apiResponse) => {

          // Catch Error
          if (apiResponse.status !== 'OK') {
            console.log(`Error in query`);
            if (apiResponse.errorData !== undefined) {
              console.log(apiResponse.errorData);
            }
            return;
          }

          // Log API response and change to show mode
          console.log(apiResponse);
          callback()
          return true
        })
        .fail((status) => {
          console.log(status);
        })
    })
  }

  getIdForNewPerson(data, saveEntity) {
    $.post(urlGen.apiPeopleGetNewId())
      .done((apiResponse) => {

        // Catch Error
        if (apiResponse.status !== 'OK') {
          console.log(`Error in query`);
          if (apiResponse.errorData !== undefined) {
            console.log(apiResponse.errorData);
          }
          return false
        }
        else {
          console.log(apiResponse)
          data.id = apiResponse.id
          saveEntity(data)
        }

      })
      .fail((status) => {
        console.log(status);
        return false
      })
  }

  // Functions for saving and getting tags to/from global tag cache
  saveTagsAsHints(tags) {

    // Make API Call
    $.post(urlGen.apiTagEditorSaveTagsAsHints(), {'tags': tags})
      .done((apiResponse) => {

        // Catch Error
        if (apiResponse.status !== 'OK') {
          console.log(`Error in query`);
          if (apiResponse.errorData !== undefined) {
            console.log(apiResponse.errorData);
          }
          return
        }

        return true
      })
      .fail((status) => {
        console.log(status);
      })
  }

  getTagHints(callback) {

    // Make API Call
    $.post(urlGen.apiTagEditorGetAllTags())
      .done((apiResponse) => {

        // Catch Error
        if (apiResponse.status !== 'OK') {
          console.log(`Error in query`);
          if (apiResponse.errorData !== undefined) {
            console.log(apiResponse.errorData);
          }
          return []
        }

        // Log API response and change to show mode
        console.log(apiResponse)
        callback(apiResponse.tags)
        return true
      })
      .fail((status) => {
        console.log(status)
        return []
      })
  }
}
