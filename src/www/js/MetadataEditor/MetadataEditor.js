import {OptionsChecker} from "@thomas-inst/optionschecker";
import {urlGen} from "../pages/common/SiteUrlGen";
import {TagEditor} from "../widgets/TagEditorLukas";
import {ConfirmDialog} from "../pages/common/ConfirmDialog";
import * as entityConstants from "../constants/Entity";
import {EditableTextField} from "../widgets/EditableTextField";


export const Mode_Create = 'create';
export const Mode_Edit = 'edit';
export const Mode_Show = 'show';
export const Mode_Dialog = 'dialog';

export class MetadataEditor {

  constructor(options) {

    const oc = new OptionsChecker({
      optionsDefinition:  {
        containerSelector: { type:'string', required: true},
        entityDataSchema: {type: 'object', required: true},
        entityData: {type: 'object', required: false, default: {}},
        mode: {type:'string', required: true},
        getEntityName: { type: 'function', default: async (id) => { return `Entity ${id}` } },
        onSave: {type:'function', required: true},
        backlink: {type:'string', required: false, default: ''},
        dialogWindow: {type: 'object', required: false, default: {}},
        dialogRootMetadataEditor: {type: 'object', required: false, default: {}},
        dialogRootInputFormSelector: {type:'string', required: false, default: ''}
      }, 
      context:  "MetadataEditor"
    });
    this.options = oc.getCleanOptions(options);

    $(this.options.containerSelector).html(this.getEditorInitialHtml());
    this.metadataGridSelector = `${this.options.containerSelector} .metadataEditorGridContainer`;

    // this object gets always updated with the latest metadata
    this.entity = {
      id: -1,
      type: '', 
      predicates: [], 
      objects: [], 
      validObjectTypes: [], 
      notes: []
    }; 
    this.numPredicates = 0;

    
    this.sectionTitles = [];
    this.sectionStructure = [];
    this.tagEditor = undefined;
    this.singleEditingActive = false;
    this.people = [];
    this.apiCallIdGetMatchingPeople = 0;
    this.currentMode = '';

    // selectors
    this.buttonsSelectorTop = `${this.options.containerSelector} .buttons_top`;
    this.buttonsSelectorBottom = `${this.options.containerSelector} .buttons_bottom`;
    this.datalistSelector = this.options.containerSelector + " #people-datalist";

    switch (this.options.mode) {
      case Mode_Edit:
        this.setupEditMode()
        break
      case Mode_Create:
        this.setupCreateMode()
        break
      case Mode_Show:
        this.setupShowMode()
        break
      case Mode_Dialog:
        this.setupDialogMode()
        break
    }
  }

  /**
   * Editor Setup
   * @private
   */
  getEditorInitialHtml() {
    return `<div class="entity_attr0"></div>
        <div class="buttons_top" align="right"></div>
        <div class='metadataEditorGridContainer'>
        </div>
        <div class="buttons_bottom" align="left"></div>
        <div class="errorMessage" style="font-style: oblique"></div>
        <br>`;
  }

  setupEditMode() {
    this.currentMode = Mode_Edit
    this.buildEntity().then(() => {
      this.makeGridStructure();
      this.setupTableForUserInput(() => {
        this.setupCancelButton();
        this.setupSaveButton();
        console.log(`edit-mode for metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} activated.`);
      })
    })
  }

  setupCreateMode() {
    this.currentMode = Mode_Create

    this.buildEntitySchema().then(() => {
      this.makeGridStructure();
      this.setupTableForUserInput(() => {
        this.setupSaveButton();
        this.makeBackButton();
        console.log(`create-mode for new entity of type '${this.entity.type}' activated.`);
      })
    })
  }

  setupShowMode() {
    this.currentMode = Mode_Show;
    // this.removeSpinner();
    this.buildEntity().then(() => {
      this.makeGridStructure();
      this.setupBackAndEditButton();
      this.showMetadata();
      console.log(`show-mode for metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} activated.`)
    })
  }

  setupDialogMode() {
    this.currentMode = Mode_Dialog;

    this.buildEntitySchema().then(() => {
      this.makeGridStructure()
      this.setupSaveButton()
      this.setupTableForUserInput(() => {
        console.log(`create-mode for new entity of type '${this.entity.type}' activated.`)
      })
    })
  }

  // Entity and Table Management


  /**
   * Updates the empty object this.entity with the data from this.options when instantiating a new metadata editor
   * @return {Promise<void>}
   * @private
   */
  async buildEntity() {

    if (this.entity.id === -1) {
      this.entity.id = this.options.entityData.id;
    }
    this.entity.type = this.options.entityData.type;
    if (this.entity.objects.length === 0) { // After having edited and saved objects and notes, they get updated via the updateEntityData function
      for (let section of this.options.entityDataSchema.sections) {
        this.sectionTitles.push(section.title);
        // TODO: change these loops into something more readable
        for (let statement of this.options.entityData.statements) {
          for (let predicate of section.predicates) {
            if (statement.predicate === predicate.id) {
              this.sectionStructure.push(section.type);
              this.entity.objects.push(statement.object);
              if (predicate.title !== '') {
                this.entity.predicates.push(predicate.title);
              }
              else if (predicate['iconUrl'] !== '') {
                this.entity.predicates.push(predicate['iconUrl']);
              }
              else {
                for (let metadata of statement.statementMetadata) {
                  // TODO: support all metadata types, not only ObjectUrlType
                  if (metadata[0] === entityConstants.pObjectUrlType) {
                    this.entity.predicates.push(await this.options.getEntityName(metadata[1]));
                  }
                }
              }
              for (let statementMetadata of statement.statementMetadata) {
                if (statementMetadata[0] === entityConstants.pStatementEditorialNote) {
                  this.entity.notes.push(statementMetadata[1]);
                }
              }

              // THIS HAS TO BE REPLACED BY: this.entity.validObjectTypes.push(predicate.validObjectTypes)
              switch (section.title) {
                case 'Biographical Data':
                  this.entity.validObjectTypes.push(['text', 'empty'])
                  break
                case 'External Links':
                  this.entity.validObjectTypes.push(['url', 'empty'])
                  break
                case '':
                  this.entity.validObjectTypes.push(['text', 'number', 'mixed', 'empty'])
              }
            }
          }
        }
      }
    }

    // store number of predicates of the entity
    this.numPredicates = this.entity.predicates.length;
  }

  // updates the empty object this.entity with the data-schema from this.options when creating a new entity
  async buildEntitySchema() {
    this.entity.type = this.options.entityDataSchema.typeId

    for (let section of this.options.entityDataSchema.sections) {
      this.sectionTitles.push(section.title)
      for (let predicate of section.predicates) {

        this.sectionStructure.push(section.type)
        this.entity.predicates.push(predicate.title)

        // THIS HAS TO BE REPLACED BY: this.entity.validObjectTypes.push(predicate.validObjectTypes)
        switch (section.title) {
          case 'Biographical Data':
            this.entity.validObjectTypes.push(['text', 'empty'])
            break
          case 'External Links':
            this.entity.validObjectTypes.push(['url', 'empty'])
            break
          case '':
            this.entity.validObjectTypes.push(['text', 'number', 'mixed', 'empty'])
        }
      }
    }

    // store number of objects
    this.numPredicates = this.entity.predicates.length
  }

  getObjectByPredicateFromEntity(predicate) {
    let i = this.entity.predicates.indexOf(predicate)
    return this.entity.objects[i]
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

  /**
   * @private
   */
  makeGridStructure() {
    this.clearGrid()
    this.makeGridCells()
  }

  /**
   * @private
   */
  makeGridCells () {

    // Editor for entity name
    let name = 'Name';
    if (this.currentMode === Mode_Show || this.currentMode === Mode_Edit) {
      name = this.options.entityData.name;
    }
    new EditableTextField({
        verbose: false,
        containerSelector: `${this.options.containerSelector} .entity_attr0`,
        initialText: name,
        editIcon: '<i class="fas fa-pencil-alt fa-2xs" style="color: dimgray"></i>',
        confirmIcon: '<i class="fa fa-check fa-2xs" style="color: green"></i>',
        cancelIcon: '<i class="fa fa-times fa-2xs" style="color: darkred"></i>',
        onConfirm: () => {console.log('CONFIRMED')} // PUT IN HERE API CALL TO SAVE NEW STATEMENT
    });


    let sectionIndex = 0

    for (let i = 1; i <= this.numPredicates; i++) {

      if (this.sectionStructure[i-1] !== this.sectionStructure[i-2]) {
        $(this.metadataGridSelector).append(`<div class="grid-header" style="grid-row-start: ${i+sectionIndex}; grid-row-end: ${i+sectionIndex}; grid-column-start: 0; grid-column-end: 6; font-size: large"><br><b>${this.sectionTitles[sectionIndex]}</b></div>`)
        sectionIndex++
      }

      if (this.sectionStructure[i-1] === 'verticalList') {

        var rowSectionStartIndex = 'null';
        let cellId = "entity_attr" + i
        let editAttributeButton = "entity_attr" + i + "_editButton"
        let predicateName = this.entity.predicates[i-1] + "&emsp;&emsp;"

        if (this.currentMode !== Mode_Show) {
          $(this.metadataGridSelector).append(`<div class="grid-header" style="grid-row-start: ${i+1}; grid-row-end: ${i+1}">${predicateName}</div>
                              <div class="${cellId} grid-main" style="grid-row-start: ${i+1}; grid-row-end: ${i+1};"></div>`)
        } else {
          let cellButtonsAndIconsId = cellId + "_tableCellButton"
          $(this.metadataGridSelector).append(`<div class="grid-header" style="grid-row-start: ${i+1}; grid-row-end: ${i+1};">${predicateName}</div>
                              <div class="${cellId} grid-main" style="grid-row-start: ${i+1}; grid-row-end: ${i+1};"></div>
                              <div class="${cellButtonsAndIconsId} grid-icons" style="text-align: right; grid-row-start: ${i+1}; grid-row-end: ${i+1};">
                                  <button class=${editAttributeButton} style="border: transparent; background-color: transparent"><i class="fas fa-pencil-alt" style="color: dimgray"></i></button>
                              </div>`)
          this.makeEditIconEvent(editAttributeButton)
        }
      } else if (this.sectionStructure[i-1] === 'horizontalList') {

        if (rowSectionStartIndex === 'null') {rowSectionStartIndex=i+2; var j=1;} else {j=j+3}

        let cellId = "entity_attr" + i
        let editAttributeButton = "entity_attr" + i + "_editButton"
        let predicateName = `<img class="id-logo" src="${this.entity.predicates[i-1]}">`

        if (this.currentMode !== Mode_Show) {
          $(this.metadataGridSelector).append(`<div class="grid-header-row" style="grid-row-start: ${rowSectionStartIndex}; grid-row-end: ${rowSectionStartIndex}; grid-column-start: ${j}; grid-column-end: ${j};">${predicateName}</div>
                              <div class="${cellId} grid-main-row" style="grid-row-start: ${rowSectionStartIndex}; grid-row-end: ${rowSectionStartIndex}; grid-column-start: ${j+1}; grid-column-end: ${j+1};"></div>`)
        } else {
          let cellButtonsAndIconsId = cellId + "_tableCellButton"
          $(this.metadataGridSelector).append(`<div class="grid-header-row" style="grid-row-start: ${rowSectionStartIndex}; grid-row-end: ${rowSectionStartIndex}; grid-column-start: ${j}; grid-column-end: ${j};">${predicateName}</div>
                              <div class="${cellId} grid-main-row" style="grid-row-start: ${rowSectionStartIndex}; grid-row-end: ${rowSectionStartIndex}; grid-column-start: ${j+1}; grid-column-end: ${j+1};"></div>
                              <div class="${cellButtonsAndIconsId} grid-icons-row" style="text-align: right; grid-row-start: ${rowSectionStartIndex}; grid-row-end: ${rowSectionStartIndex}; grid-column-start: ${j+2}; grid-column-end: ${j+2};">
                                  <button class=${editAttributeButton} style="border: transparent; background-color: transparent"><i class="fas fa-pencil-alt" style="color: dimgray"></i></button>
                              </div>`)
          this.makeEditIconEvent(editAttributeButton)
        }
      } else if (this.sectionStructure[i-1] === 'urlList') {

        let cellId = "entity_attr" + i
        let editAttributeButton = "entity_attr" + i + "_editButton"
        let predicateName = this.entity.predicates[i-1] + "&emsp;&emsp;"

        if (this.currentMode !== Mode_Show) {
          $(this.metadataGridSelector).append(`<div class="grid-header" style="grid-row-start: ${i+3}; grid-row-end: ${i+3};">${predicateName}</div>
                              <div class="${cellId} grid-main" style="grid-row-start: ${i+3}; grid-row-end: ${i+3};"></div>`)
        } else {
          let cellButtonsAndIconsId = cellId + "_tableCellButton"
          $(this.metadataGridSelector).append(`<div class="grid-header" style="grid-row-start: ${i+3}; grid-row-end: ${i+3};">${predicateName}</div>
                              <div class="${cellId} grid-main" style="grid-row-start: ${i+3}; grid-row-end: ${i+3};"></div>
                              <div class="${cellButtonsAndIconsId} grid-icons" style="text-align: right; grid-row-start: ${i+3}; grid-row-end: ${i+3};">
                                  <button class=${editAttributeButton} style="border: transparent; background-color: transparent"><i class="fas fa-pencil-alt" style="color: dimgray"></i></button>
                              </div>`)
          this.makeEditIconEvent(editAttributeButton)
        }
      }
    }
  }

  makeSpinner(container, size='2em') {
    $(container).html(`<div class="spinner-border" role="status" id="spinner" style="color: dodgerblue; margin-top: 0.7em; width: ${size}; height: ${size}"></div>`)
  }

  removeSpinner() {
    $('#spinner').remove()
  }

  clearTableCells() {
    for (let i=1; i<=this.numPredicates; i++) {
      let id = "#entity_attr" + i
      $(id).empty()
    }
  }

  clearGrid() {
    $(this.metadataGridSelector).empty()
  }

  // Table Data Management
  showMetadata() {

    this.clearTableCells()
    this.removeSpinner()

    for (let i = 1; i <= this.numPredicates; i++) {
      let selector = this.options.containerSelector + " .entity_attr" + i
      let object = this.entity.objects[i - 1]
      let type = this.entity.validObjectTypes[i - 1]
      let note = this.entity.notes[i - 1]

      if (type.includes('person') && object !== '') {
        let url = urlGen.sitePerson(object)
        let linkId = "linktoperson" + object
        let name = this.getPersonNameByIdFromPeople(object)
        object = `<a id=${linkId} href=${url} >${name}</a>`
        $(selector).append(object)

      } else if (type.includes('years_range')) {
        object = this.formatYearForShowModesRangeForShowMode(object)
        $(selector).append(object)

      } else if (type.includes('year')) {
        object = this.formatYearForShowMode(object)
        $(selector).append(object)

      } else if (type.includes('tags')) {
        let tagEditorId = 'tag-editor-' + (1 + Math.floor(Math.random() * 10000))
        this.tagEditor = new TagEditor({
          containerSelector: selector,
          idPrefix: tagEditorId,
          tags: object,
          mode: 'show'
        })
      } else if (type.includes('date')) {
        object = this.formatDateForShowMode(object)
        $(selector).append(object)

      } else if (type.includes('url')) {
        let extLink
        if (object[0] !== 'h') {extLink = 'http://' + object} else {extLink = object}
        object = `<a target="_blank" href=${extLink}>${object}</a>`
        $(selector).append(object)
      } else {
        $(selector).append(object)
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

  setupTableForUserInput(callback, predicateIndex='all') {

    this.setupInputFormByIndex(predicateIndex)

    if (this.currentMode === Mode_Create || this.currentMode === Mode_Dialog) {
      callback()
    }
    else {
      this.addValueToInputFormByIndex(predicateIndex)
      callback()
    }
  }

  setupInputFormByIndex(predicateIndex) {
    if (predicateIndex === 'all') {
      for (let i = 1; i <= this.numPredicates; i++) {
        let selectorId = this.options.containerSelector + " .entity_attr" + i
        let inputFormId = "entity_attr" + i + "_form"
        let type = this.entity.validObjectTypes[i-1][0] // first possible type of data, set in the corresponding schema, determines type of input form

        this.setupInputFormByType(type, selectorId, inputFormId)

      }
    } else {
      let selectorId = this.options.containerSelector + " .entity_attr" + predicateIndex
      let inputFormId = "entity_attr" + predicateIndex + "_form"
      let type = this.entity.validObjectTypes[predicateIndex-1][0] // first possible type of data, set in the corresponding schema, determines type of input form

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
    let buttonId = inputFormId + '_info-note-button'
    let buttonSelector = this.options.containerSelector+ " ." + buttonId

    $(noteSelector).hide()
    $(noteSelector).on('focusout', () => {
      if ($(noteSelector).val().replaceAll(' ', '') === '') {
        $(noteSelector).hide()
        this.makeInfoIconWithEvent(selectorId, buttonId, buttonSelector, noteSelector)
      }
    })
  }

  makeTagsInputForm(selectorId) {
    let tagEditorId = 'tag-editor-' + (1 + Math.floor( Math.random() * 10000))
    this.tagEditor = new TagEditor({
      containerSelector: selectorId,
      idPrefix: tagEditorId,
      tags: this.getObjectByPredicateFromEntity('Tags'),
      mode: 'edit'
    })
    this.getTagHints((tagHints) => {
      this.tagEditor.setTagHints(tagHints)
    })
  }

  // makePersonInputForm(selector, inputFormId) {
  //   let list = "people-datalist"
  //   let listSelector = '#' + list
  //   let paragraphId = inputFormId + '_paragraph'
  //
  //   $(selector).html(`<p class='${paragraphId} embed-button'>
  //           <input class='${inputFormId} form-control' list=${list} placeholder="person" autoComplete="off" style="padding: unset">
  //               <datalist id=${list}></datalist></p>`)
  //   this.addNamesToDatalistForPersonsAsValues(this.people, listSelector)
  //   this.makePersonInputFormEvents(inputFormId, listSelector, paragraphId)
  // }

  makePersonInputForm(selector, inputFormId) {
    let list = "people-datalist"
    let paragraphId = inputFormId + '_paragraph'
    let inputSelector = this.options.containerSelector + ' .' + inputFormId
    let predicateIndex = inputFormId.match(/\d+/)[0]

    $(selector).html(`<p class='${paragraphId} embed-button'>
            <input class='${inputFormId} form-control' placeholder="person" autoComplete="off" style="padding: unset">
                <ul class="matched-persons dropdown-menu dropdown-menu-right" data-display="static" id=${list}></ul></p>`)

    // This ensures, that existing data will be validated correctly, because validation compares the user input to datalist entries
    if (!(this.currentMode === Mode_Dialog || this.currentMode === Mode_Create)) {
      this.addValueToInputFormByIndex(predicateIndex)
      this.getMatchingPeople($(inputSelector).val(), (people) => {
        this.addNamesToDatalistForPersonsAsValues(people, this.datalistSelector)
        $(this.datalistSelector).hide()
      })
    }

    this.makePersonInputFormEvents(inputFormId, paragraphId)
  }

  delay(callback, ms) {
    let timer = 0;
    return function() {
      let context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        callback.apply(context, args);
      }, ms || 0);
    };
  }


  getMatchingPeople(value, callback) {

    console.log('VALUE')
    console.log(value)

    let apiCallIdGetMatchingPeople = this.apiCallIdGetMatchingPeople

    $.post(urlGen.apiPeopleGetMatchingPeople(), {'value': value})
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
          callback(apiResponse.data, apiCallIdGetMatchingPeople)
          return true
        }
      })
      .fail((status) => {
        console.log(status);
        return false
      })
  }

  addNamesToDatalistForPersonsAsValues(people, listSelector) {

    let id = 'none'

    $(listSelector).empty()

    for (let person of people) {
      id = person.id
      let name = person.values[0]
      if (name !== undefined) {
        let nameForValueAttribute = name.replaceAll(' ', '_')
        $(listSelector).append(`<li class="dd-menu-item" value=${nameForValueAttribute} id=${id}><button class="matched-entity" value="${nameForValueAttribute}">${name}</button></li>`)}
    }

    if (id !== 'none') {
      $(listSelector).show()
    } else {
      $(listSelector).hide()
    }
  }

  makeMatchedEntityButtonEvent(inputSelector, plusIcon) {

    let predicateIndex = inputSelector.match(/\d+/)[0]
    let selectorId = this.options.containerSelector+"_entity_attr"+predicateIndex
    let inputFormId = "entity_attr"+predicateIndex+"_form"
    let buttonId = inputFormId + '_info-note-button'
    let buttonSelector = this.options.containerSelector+ " ." + buttonId
    let noteId = inputFormId + '_info-note'
    let noteSelector = this.options.containerSelector+ " ." + noteId

    $(this.options.containerSelector+" .matched-entity").on("click", (e) => {
      let value = $(e.target).val().replaceAll('_', ' ')
      $(inputSelector).val(value)
      $(plusIcon).remove()
      this.makeShowAndHideInfoEvents(selectorId, inputFormId)
      this.makeInfoIconWithEvent(selectorId, buttonId, buttonSelector, noteSelector)
      $(inputSelector).focus()
      $(this.options.containerSelector+" .dropdown-menu").hide()
    })
  }

  makePersonInputFormEvents(inputFormId, paragraphId) {

    let dialog = ''
    let buttonId = inputFormId + '_create-person-from-datalist-button'
    let buttonSelector = this.options.containerSelector + ' .' + buttonId
    let inputSelector = this.options.containerSelector + ' .' + inputFormId
    let paragraphSelector = this.options.containerSelector + ' .' + paragraphId

    if (!(this.currentMode === Mode_Dialog)) {
      dialog = this.makeDialog(inputSelector)
    } else {
      $(inputSelector).on('focus', () => {
        dialog = this.makeDialog(inputSelector)
      })
    }

    $(inputSelector).on('input', this.delay(() => {

        let value = $(inputSelector).val()
        if (value.trim().length === 0) {
          $(this.options.containerSelector + " .dropdown-menu").hide()
        } else {
          this.apiCallIdGetMatchingPeople = (1 + Math.floor(Math.random() * 10000))
          this.getMatchingPeople(value, (people, apiCallIdGetMatchingPeople) => {
            if (this.apiCallIdGetMatchingPeople === apiCallIdGetMatchingPeople) { // This ensures, that only the data of the latest api call are shown, if there have been multiple requests following another in a short amount of time
              this.addNamesToDatalistForPersonsAsValues(people, this.datalistSelector)
              this.makeMatchedEntityButtonEvent(inputSelector, buttonSelector)
              $(inputSelector).val(value.replaceAll('_', ' '))
              let valueForDatalist = value.replaceAll(' ', '_')
              $(buttonSelector).remove()
              if ($(`${this.datalistSelector} li[value=${valueForDatalist}]`).attr('id') === undefined) {
                $(paragraphSelector).append(`<button class=${buttonId}><i class="fa fa-plus" style="color: dodgerblue"></i></button>`)
                this.makeCreatePersonFromInputFormButtonEvent(buttonSelector, dialog, inputSelector)
              }
            }
          })
        }
      }, 200)
    )
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

    let predicateIndex = this.options.dialogRootInputFormSelector.match(/\d+/)[0]
    let saveIcon = ".entity_attr" + predicateIndex + "_saveButton"
    $(saveIcon).click();
  }

  updateDatalistInRootMetadataEditor () {
    let value = $(`${this.options.containerSelector} .entity_attr1_form`).val()
    let valueForDatalist = value.replaceAll(' ', '_')
    $(this.options.dialogRootMetadataEditor.datalistSelector).append(`<option value=${valueForDatalist} id=${this.people.length}>${value}</option>`)
  }

  setupMetadataEditorInDialogWindow (entity, selector, dialog, inputFormId) {

    console.log('HELLO')
    console.log(entity.predicates)

    let mde = new MetadataEditor({
      containerSelector: selector,
      entityDataSchema: this.options.entityDataSchema,
      mode: 'dialog',
      onSave: this.options.onSave,
      dialogWindow: dialog,
      dialogRootMetadataEditor: this,
      dialogRootInputFormSelector: inputFormId
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

    if ($(noteSelector).is(":hidden")) {
      this.makeInfoIconWithEvent(selectorId, buttonId, buttonSelector, noteSelector)
    }
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

  addValueToInputFormByIndex(predicateIndex) {
    if (predicateIndex === 'all') {
      for (let i=1; i<=this.numPredicates; i++) {
        this.addValueToInputFormByType(this.entity.validObjectTypes[i-1][0], i)
      }
    } else {
      this.addValueToInputFormByType(this.entity.validObjectTypes[predicateIndex-1][0], predicateIndex)
    }
  }

  addValueToInputFormByType(type, index) {

    let objects = this.entity.objects
    let notes = this.entity.notes
    let entityAttrFormId = this.options.containerSelector + " .entity_attr" + index + "_form"
    let entityAttrNoteId = this.options.containerSelector + " .entity_attr" + index + "_form_info-note"

    switch (type) {
      case 'year':
        let idYearBcAd = entityAttrFormId + "_year_bc_ad"
        $(entityAttrFormId).val(objects[index-1][0])
        $(idYearBcAd).val(objects[index-1][1])
        break
      case 'years_range':
        let idYearsRangeEnd = entityAttrFormId + "_years_range_end"
        let idYearsRangeNote = entityAttrFormId + "_years_range_note"
        $(entityAttrFormId).val(objects[index-1][0])
        $(idYearsRangeEnd).val(objects[index-1][1])
        $(idYearsRangeNote).val(objects[index-1][2])
        break
      case 'person':
        if (objects[index-1] !== '') {
          let name = this.getPersonNameByIdFromPeople(objects[index-1])
          $(entityAttrFormId).val(name)
        }
        break
      default:
        $(entityAttrFormId).val(objects[index-1])
    }

    if (notes[index-1] !== undefined) {
      if (notes[index - 1].replaceAll(' ', '') !== '') {
        $(entityAttrNoteId).val(notes[index - 1])
        $(entityAttrNoteId).show()
        let buttonId = "entity_attr" + index + "_form" + '_info-note-button'
        this.removeInfoIcon(buttonId, 0)
      }
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
      let d = this.getEntityDataFromInputFormByIndex()

      // validate and save data, execute the callback-function given in the options, check if working in dialog window
      if (this.validateData(d) && this.validatePasswords()) {
        this.makeSpinner(this.buttonsSelectorBottom)
        this.updateEntityData(d.id, d.type, d.objects, d.notes)
        this.saveTagsAsHints(this.tagEditor.getTags())
        this.options.onSave(this.entity, this.currentMode).then( () => {
          this.logSaveAction(this.currentMode)
          if (this.currentMode === Mode_Dialog) {
            this.copyValueFromDialogToRootAndSave()
            this.options.dialogWindow.hide()
            this.options.dialogWindow.destroy()
            this.options.dialogRootMetadataEditor.updatePeople(this.entity.id, d.objects[0])
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
        let predicateIndex = selector.match(/\d+/)[0]
        let inputForm = this.options.containerSelector + " .entity_attr" + predicateIndex + "_form"
        this.setupTableForUserInput(() => {
          this.replaceEditWithSaveAndAbortIcons(predicateIndex)
          $(inputForm).focus()
          if (this.tagEditor !== undefined) {
            this.tagEditor.focus()
          }
          console.log(`'${this.entity.predicates[predicateIndex-1]}' in edit mode!`)
        }, predicateIndex)
        this.currentMode = Mode_Edit
        this.singleEditingActive = true
        this.mutePencilAndInfoIcons(predicateIndex)
      }
    })
  }

  mutePencilAndInfoIcons(predicateIndex) {
    for (let i=1; i<=this.numPredicates; i++) {
      let selector = this.options.containerSelector + " .entity_attr" + i + "_tableCellButton"
      if (i !== parseInt(predicateIndex)) {
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
      let predicateIndex = selector.match(/\d+/)[0]
      this.clearErrorMessage()
      this.setupShowMode()
      console.log(`Editing object for '${this.entity.predicates[predicateIndex-1]}' aborted.`)
    })
  }

  makeSaveIconEvent(selector) {
    selector = this.options.containerSelector + ' .' + selector
    $(selector).on("click",  () => {
      let predicateIndex = selector.match(/\d+/)[0]
      let cellButtonsAndIconsId = "entity_attr" + predicateIndex + "_tableCellButton"
      let cellButtonsAndIconsSelector = this.options.containerSelector + ' .' + cellButtonsAndIconsId
      let object = this.getEntityDataFromInputFormByIndex(predicateIndex)['object']
      let note = this.getEntityDataFromInputFormByIndex(predicateIndex)['note']
      if (this.validateData(object, predicateIndex)) {
        this.clearErrorMessage()
        this.makeSpinner(cellButtonsAndIconsSelector, '1.25em')
        if (this.entity.validObjectTypes[predicateIndex-1].includes('tags')) {
          this.saveTagsAsHints(object)
        }
        this.entity.objects[predicateIndex-1] = object // Corresponds to updateEntityData function in global save event
        this.entity.notes[predicateIndex-1] = note // Corresponds to updateEntityData function in global save event
        this.options.onSave(this.entity, this.currentMode).then(() => {
          this.logSaveAction(this.currentMode)
          this.singleEditingActive = false
          this.setupShowMode()
        })
        console.log(`Saved object for '${this.entity.predicates[predicateIndex-1]}'.`)
      }
    })
  }

  makeEditButtonEvent() {
    $(`${this.options.containerSelector} .edit_button`).on("click",  () => {

      this.currentMode = Mode_Edit

      // Clear Messages
      this.clearErrorMessage()
      this.setupEditMode()
    })
  }

  makeCancelButtonEvent() {
    $(`${this.options.containerSelector} .cancel_button`).on("click",  () => {

      this.currentMode = Mode_Show

      // Clear Messages
      this.clearErrorMessage()
      this.clearBottomButtons()
      this.setupShowMode()
    })
  }

  updateEntityData(id, type, objects, notes) {
    this.entity.id = id
    this.entity.type = type
    this.entity.objects = objects
    this.entity.notes = notes
  }

  getEntityDataFromInputFormByIndex(predicateIndex='all') {
    let id = this.entity.id
    let objects = []
    let notes = []
    let type = this.entity.type

    if (predicateIndex === 'all') {
      for (let i = 1; i <= this.numPredicates; i++) {
        let objectAndNote = this.getEntityDataFromInputFormByType(this.entity.validObjectTypes[i-1], i)
        objects.push(objectAndNote['object'])
        notes.push(objectAndNote['note'])
      }
      return {id: id, type: type, objects: objects, notes: notes}
    } else {
      return this.getEntityDataFromInputFormByType(this.entity.validObjectTypes[predicateIndex-1], predicateIndex)
    }
  }

  getEntityDataFromInputFormByType (type, predicateIndex) {

    let selector = this.options.containerSelector + " .entity_attr" + predicateIndex + "_form"
    let value = $(selector).val()
    let noteSelector = this.options.containerSelector + " .entity_attr" + predicateIndex + "_form_info-note"
    let note = $(noteSelector).val()
    if (note === undefined) {note = ''}

    if (type.includes('year')) {
      return {
        'object': this.getDataForYearFromInputForm(selector, value),
        'note': note
      }

    } else if (type.includes('years_range')) {
      return {
        'object': this.getDataForYearsRangeFromInputForm(selector, value),
        'note': note
      }

    } else if (type.includes('tags')) {
      return {
        'object': this.tagEditor.getTags(),
        'note': ''
      }

    } else if (type.includes('person')) {
      let person_id
      try { // get person id for given person name, therefore remove blanks, which are not contained in the datalist values
        let valueForDatalist = value.replaceAll(' ', '_')
        person_id = $(`${this.datalistSelector} li[value=${valueForDatalist}]`).attr('id')
      } catch {
        person_id = ''
      }
      return {
        'object': person_id,
        'note': note
      }

    } else {
      return {
        'object':value,
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
  validateData (d, predicateIndex='all') {

    let index = 0

    if (predicateIndex === 'all') { // full edit
      for (let object of d.objects) {

        let predicate = this.entity.predicates[index]
        let affordedTypes = this.entity.validObjectTypes[index]

        if (!affordedTypes.includes('password') && !this.isValid(predicate, affordedTypes, this.dataType(object), object)) { // Passwords do not need to undergo a check here
          return false
        } else {
          index++
        }
      }
    } else { // single edit

      let predicate = this.entity.predicates[predicateIndex-1]
      let affordedTypes = this.entity.validObjectTypes[predicateIndex-1]
      let object = d

      if (!affordedTypes.includes('password') && !this.isValid(predicate, affordedTypes, this.dataType(object), object)) { // Passwords do not need to undergo a check here
        return false
      }
    }
    return true
  }

  isValid(predicate, affordedTypes, givenType, object) {
    if (this.typesNotMatching(givenType, affordedTypes) || object === undefined) {
      this.returnDataTypeError(predicate, givenType, affordedTypes)
      return false
    } else if (this.inconsistentDates(predicate, givenType, object)) {
      this.returnImpossibleDatesError()
      return false
    } else if (this.inconsistentYearsRange(affordedTypes, object)) {
      this.returnImpossibleYearsRangeError(predicate)
      return false
    } else if (this.nameIsDuplicate(predicate, givenType, object)) {
      this.returnDuplicateInNameError(object)
    } else {
      return true
    }
  }

  nameIsDuplicate (predicate, givenType, object) {
    let names = this.getNamesOfAllThePeople()
    return givenType === 'text' && names.includes(object) && object !== this.entity.objects[0]
  }

  typesNotMatching (givenType, affordedTypes) {
    return affordedTypes.includes(givenType) === false && !(affordedTypes.includes('person') && givenType === 'number')
  }

  inconsistentDates(predicate, givenType, object) {

    if (givenType !== 'date') {
      return false
    } else {
      let date_birth = '0'
      let date_death = 'z'

      // get dates of birth and death
      if (predicate === 'Date of Birth' && object !== '' && this.getObjectByPredicateFromEntity('Date of Death') !== '') {
        date_birth = object
        date_death = this.getObjectByPredicateFromEntity('Date of Death')
      }
      if (predicate === 'Date of Death' && object !== '' && this.getObjectByPredicateFromEntity('Date of Birth') !== '') {
        date_death = object
        date_birth = this.getObjectByPredicateFromEntity('Date of Birth')
      }
      return date_birth > date_death
    }
  }

  inconsistentYearsRange(affordedTypes, object) {
    return affordedTypes.includes('years_range') &&
      (parseInt(object[0]) > parseInt(object[1]) || (object[0] === '' && object[1] !== '') || (object[0] === '' && object[2] !== ''))
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

  dataType(object) {

    let type

    if (object === undefined) {
      type = object
    }
    else if (Array.isArray(object)) {
      if (this.isYearsRange(object)) {
        type = 'years_range'
      }
      else if (this.isYear(object)) {
        type = 'year'
      }
      else if (this.isIncorrectYear(object)) {
        type = this.dataType(object[0])
      }
      else if (this.isEmptyArray(object)) {
        type = 'empty'
      } else {
        type = 'tags'
      }
    }
    else if (this.isMail(object)) {
      type = 'email'
    }
    else if (this.isUrl(object)) {
      type = 'url'
    }
    else if (this.containsNumber(object)) {

      if (this.containsOnlyNumbers(object)) {
        type = 'number'
      }
      else if (this.isDate(object)) {
        type = 'date'
      }
      else {
        type = 'mixed'
      }
    }
    else if (object === "") {
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

  isIncorrectYear(object) {
    return object.length === 2 && object[1] === 'BC' || object[1] === 'AD'
  }

  isMail(str) {
    return /.+@.+\..+/.test(str)
  }

  isUrl(str) {
    return /www\..+\..+/.test(str) || /http.+\/\/.+\..+/.test(str)
  }

  containsNumber(str) {
    return /\d/.test(str);
  }

  containsOnlyNumbers(str) {
    return /^\d+$/.test(str)
  }

  isDate(str) {
    return /..-..-.+/.test(str) || /..-..-.+-.+/.test(str)
  }

  // Error Communication and Logging
  returnDataTypeError(predicate, givenType, affordedTypes) {
    console.log(`Data Type Error! Given data for '${predicate}' is of type '${givenType}' but has to be of one of the types '${affordedTypes}'. Please try again.`)
    this.returnError(`Error! Given data for '${predicate}' is of type '${givenType}' but has to be of one of the types '${affordedTypes}'. Please try again.`)
  }

  returnImpossibleDatesError() {
    console.log('Impossible Dates Error!')
    this.returnError(`Error! Given date for 'Date of Birth' is after given date for 'Date of Death'. Please try again.`)
  }

  returnImpossibleYearsRangeError(predicate) {
    console.log('Impossible Years Range Error!')
    this.returnError(`Error! Given data for '${predicate}' are inconsistent. Please try again.`)
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
    if (mode === Mode_Edit) {
      console.log(`Saved alterations of entity with ID ${this.entity.id}.`)
    }
    else if (mode === Mode_Create || mode === Mode_Dialog) {
      console.log(`Created new entity of type '${this.entity.type}' with ID ${this.entity.id}.`)
    }
  }

  // API Calls
  getPeople(callback) {
    $.get(urlGen.apiEntityTypeGetEntities(107))
      .done((apiResponse) => {
        console.log(`GetAllEntities response`, apiResponse);
          this.people = apiResponse.data
          callback()
        // }

      })
      .fail((status) => {
        console.log(status);
        return false
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

    console.log('TAGS')
    console.log(tags)

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

// Load as global variable so that it can be referenced in the Twig template
window.MetadataEditor = MetadataEditor