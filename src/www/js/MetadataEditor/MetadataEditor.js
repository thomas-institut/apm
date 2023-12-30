import {OptionsChecker} from "@thomas-inst/optionschecker";
import {urlGen} from "../pages/common/SiteUrlGen";
import {TagEditor} from "../widgets/TagEditor";
import {ConfirmDialog, LARGE_DIALOG} from "../pages/common/ConfirmDialog";

export class MetadataEditor {

    constructor(options) {

        const optionsDefinition = {
            container: { type:'string', required: true},
            entityId: {type:'string', required: true},
            entityType: {type:'string', required: true},
            metadata: {type:'array', required: false, default: []},
            metadataSchema: {type: 'object', required: true},
            mode: {type:'string', required: true},
            callback: {type:'function', required: true},
            theme: {type:'string', required: true},
            backlink: {type:'string', required: false, default: ''}
        }

        const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "MetadataEditor"})
        this.options = oc.getCleanOptions(options)

        // Fill container with the metadata editor html structure
        this.makeEditor(options.container)

        // Globals
        this.entity = {id: '', type: '', keys: [], values: [], types: []}
        this.numKeys = 0
        this.mode = {create: 'create', edit: 'edit', show: 'show'}
        this.tagEditor = undefined
        this.singleEdit = false
        this.people = []

        // Selectors
        this.buttonsSelectorTop = 'buttons_top'
        this.buttonsSelectorBottom = 'buttons_bottom'

        // Get list of all people (for handling of entities as values, saving their ids, showing their names) and setup metadata editor in desired mode
        this.getPeople(() => {
            switch (this.options.mode) {
                case this.mode.edit:
                    this.setupEditMode()
                    break
                case this.mode.create:
                    this.setupCreateMode()
                    break
                case this.mode.show:
                    this.setupShowMode()
                    break
            }
        })
    }

    // Editor Setup
    makeEditor(container) {
        container = "#" + container

        let tableClass
        switch (this.options.theme) {
            case 'vertical':
                tableClass = 'table'
                break
            case 'horizontal':
                tableClass = 'dataTable'
                break
        }
        $(container).html(
            `<br>
                            <div id="buttons_top" align="right"></div>
                            <br>
                            <table class=${tableClass} id="metadataTable" style="table-layout:fixed;">
                            </table>
                            <br>
                            <div id="buttons_bottom" align="left"></div>
                            <div id="errorMessage" style="font-style: oblique"></div>
                            <br>`)
    }

    setupEditMode() {
        this.options.mode = this.mode.edit
        this.buildEntity(() => {
            this.makeTableStructure()
            this.setupTableForDataInput(() => {
                this.setupCancelButton()
                this.setupSaveButton()
                console.log(`edit-mode for metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} activated.`)
            })
        })
    }

    setupCreateMode() {
        this.options.mode = this.mode.create
        this.buildEntitySchema(() => {
            this.makeTableStructure()
            this.setupTableForDataInput(() => {
                this.setupSaveButton()
                this.makeBackButton()
                console.log(`create-mode for new entity of type '${this.entity.type}' activated.`)
            })
        })
    }

    setupShowMode() {
        this.options.mode = this.mode.show
        this.removeSpinner()
        this.buildEntity(() => {
            this.makeTableStructure()
            this.setupBackAndEditButton()
            this.showMetadata()
            console.log(`show-mode for metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} activated.`)
        })
    }

    // Entity and Table Management
    buildEntity(callback) {
        this.entity.id = this.options.entityId
        this.entity.type = this.options.entityType
        if (this.entity.values.length === 0) { // After having edited and saved values, they get updated via the updateEntityData function
            this.entity.values = this.options.metadata
        }
        this.entity.keys = this.options.metadataSchema.keys
        this.entity.types = this.options.metadataSchema.types

        // Store number of values
        this.numKeys = this.entity.keys.length

        callback()
    }

    buildEntitySchema(callback) {
        this.entity.id = this.options.entityId
        this.entity.type = this.options.entityType
        this.entity.keys = this.options.metadataSchema.keys
        this.entity.types = this.options.metadataSchema.types

        // Store number of values
        this.numKeys = this.entity.keys.length

        callback()
    }

    getValueByKey(key) {
        let i = this.entity.keys.indexOf(key)
        return this.entity.values[i]
    }

    getPersonNameById (id) {
        return this.people[id].values[0]
    }

    // Table Design Management
    makeTableStructure() {
        this.clearTable()
        this.makeTableRows()
        this.makeTableCells()
    }

    makeTableRows() {
        let tableSelector = '#metadataTable'

        switch (this.options.theme) {
            case 'horizontal':
                $(tableSelector).append(`<tr id="row1"></tr><tr id="row2"></tr>`)
                break
            case 'vertical':
                for (let i=1; i<=this.numKeys; i++) {
                    let id = "row" + i
                    $(tableSelector).append(`<tr id=${id}></tr>`)
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
                        let cellButtonId = cellId + "_tableCellButton"
                        let editAttributeButton = "entity_attr" + i + "_editButton"
                        $('#row1').append(`<th>${this.entity.keys[i-1]}</th><th></th>`)
                        $('#row2').append(`<td><div id=${cellId}></div></td>
                                                <td id=${cellButtonId} style="width: 3em; text-align: center">
                                                    <button id=${editAttributeButton} style="border: transparent; background-color: transparent">
                                                        <i class="fas fa-pencil-alt" style="color: gray"></i></button>
                                                </td>`)
                        this.makeEditIconEvent(editAttributeButton)
                    } else {
                        $('#row1').append(`<th>${this.entity.keys[i-1]}</th>`)
                        $('#row2').append(`<td><div id=${cellId}></div></td>`)
                    }
                }
                break
            case 'vertical':
                for (let i = 1; i <= this.numKeys; i++) {

                    let row = "#row" + i
                    let cellId = "entity_attr" + i
                    let editAttributeButton = "entity_attr" + i + "_editButton"
                    let keyName = this.entity.keys[i-1] + "&emsp;&emsp;"

                    if (this.options.mode !== this.mode.show) {
                        $(row).append(`<th style="vertical-align: top">${keyName}</th>
                                    <td><div id=${cellId}></div></td>`)
                    } else {
                        let cellButtonId = cellId + "_tableCellButton"
                        $(row).append(`<th style="vertical-align: top">${keyName}</th>
                                    <td><div id=${cellId}></div></td>
                                    <td id=${cellButtonId} style="width: 3em">
                                        <button id=${editAttributeButton} style="border: transparent; background-color: transparent"><i class="fas fa-pencil-alt" style="color: gray"></i></button>
                                    </td>`)
                        this.makeEditIconEvent(editAttributeButton)
                    }
                }
                break
        }
    }

    makeSpinner(container, size='2em') {
        container = "#" + container
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
        let tableSelector = '#metadataTable'
        $(tableSelector).empty()
    }

    // Table Data Management
    showMetadata() {

        this.clearTableCells()
        this.removeSpinner()

        for (let i = 1; i <= this.numKeys; i++) {
            let id = "#entity_attr" + i
            let value = this.entity.values[i-1]
            let type = this.entity.types[i-1]

            if (type.includes('person') && value !== '') {
                let url = urlGen.sitePerson(value)
                let linkId = "linktoperson" + value
                let name = this.getPersonNameById(value)
                value = `<a id=${linkId} href=${url} >${name}</a>`
                $(id).append(value)

            } else if (type.includes('years_range')) {
                value = this.formatYearsRange(value)
                $(id).append(value)

            } else if (type.includes('year')) {
                value = this.formatYear(value)
                $(id).append(value)

            } else if (type.includes('tags')) {
                let te = new TagEditor({
                    containerSelector: id,
                    tags: value,
                    mode: 'show'
                })

            } else if (type.includes('date')) {
                value = this.formatDate(value)
                $(id).append(value)

            } else if (type.includes('url')) {
                let extLink = 'http://' + value
                value = `<a target="_blank" href=${extLink}>${value}</a>`
                $(id).append(value)
            } else {
                $(id).append(value)
            }
        }
    }

    formatYearsRange(y) {
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

    formatYear(y) {
        if (y[0] !== '') {
            y = y[0] + " " + y[1]
        }
        else {
            y = ''
        }
        return y
    }

    formatDate(d) {
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

    setupTableForDataInput(callback, keyIndex='all') {

        this.setupInputFormByIndex(keyIndex)

        if (this.options.mode === this.mode.create) {
            callback()
        }
        else {
            this.addValueToInputFormByIndex(keyIndex)
            callback()
        }
    }

    setupInputFormByIndex(keyIndex) {
        if (keyIndex === 'all') {
            for (let i = 1; i <= this.numKeys; i++) {
                let selectorId = "#entity_attr" + i
                let inputId = "entity_attr" + i + "_form"
                let type = this.entity.types[i-1][0] // first possible type of data, set in the corresponding schema, determines type of input form

                this.setupInputFormByType(type, selectorId, inputId)
            }
        } else {
            let selectorId = "#entity_attr" + keyIndex
            let inputId = "entity_attr" + keyIndex + "_form"
            let type = this.entity.types[keyIndex-1][0] // first possible type of data, set in the corresponding schema, determines type of input form

            this.setupInputFormByType(type, selectorId, inputId)
        }
    }

    setupInputFormByType(type, selectorId, inputId) {
        switch (type) {
            case 'password':
                this.makePasswordForm(selectorId, inputId)
                break
            case 'date':
                this.makeDateForm(selectorId, inputId, type)
                break
            case 'year':
                this.makeYearForm(selectorId, inputId, type)
                break
            case 'years_range':
                this.makeYearsRangeForm(selectorId, inputId)
                break
            case 'person':
                this.makePersonForm(selectorId, inputId)
                break
            case 'tags':
                this.makeTagsForm(selectorId)
                break
            default:
                this.makeTextForm(selectorId, inputId, type)
        }
    }

    makeTagsForm(selectorId) {
        this.tagEditor = new TagEditor({
            containerSelector: selectorId,
            tags: this.getValueByKey('Tags'),
            mode: 'edit'
        })
    }

    makePersonForm(selector, inputId) {
        let list = inputId + "_list"
        let listSelector = "#" + list
        let paragraphId = inputId + 'paragraph'

        $(selector).html(`<p class="embed-create-button" id=${paragraphId}>
            <input class="form-control" list=${list} id=${inputId} placeholder="person" autoComplete="off" style="padding: unset">
                <datalist id=${list}></datalist></p>`)
        this.addNamesToDatalist(this.people, listSelector)
        this.makePersonFormEvent(inputId, listSelector, paragraphId)
    }

    addNamesToDatalist(people, list) {

        let id = 0

        for (let person of people) {
            id = person.id
            let name = person.values[0]
            $(list).append(`<option value=${name} id=${id}>${name}</option>`)
        }
    }

    makePersonFormEvent(inputId, list, selector) {

        let buttonId = inputId + '_create-person-from-datalist'
        let buttonSelector = '#' + buttonId
        inputId = '#' + inputId
        selector = '#' + selector

        $(inputId).on('input', () => {
            let value = $(inputId).val()
            $(buttonSelector).remove()
            if ($(`${list} option[value=${value}]`).attr('id') === undefined) {
                $(selector).append(`<button id=${buttonId}>Create</button>`)
                this.makeCreatePersonFromInputFormButtonEvent(buttonSelector)
            }
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

    setupMetadataEditor (entity, mode) {

        let mde = new MetadataEditor({
            container: 'personCreator',
            entityId: entity.id,
            entityType: entity.type,
            metadata: entity.values,
            metadataSchema: {keys: entity.keys, types: entity.types},
            callback: (data, mode, callback) => {
                savePersonData(data, mode, callback)
            },
            mode: mode,
            theme: 'vertical',
        })
    }

    makeCreatePersonFromInputFormButtonEvent (buttonSelector) {

        let dialogBody = `<div id="personCreator" align="center">Hallo</div>`

        $(buttonSelector).on('click', () => {

            let dialog = new ConfirmDialog({
                title: 'Create Person',
                size: LARGE_DIALOG,
                acceptButtonLabel: 'Save',
                body: dialogBody,
                hideOnAccept: false,
                cancelFunction: () => {
                    console.log(`Canceled person creation.`)
                }
            })
            dialog.show()
            let dialogSelector = dialog.getSelector().replace('#', '')

            // let mde = new MetadataEditor({
            //     container: dialogSelector,
            //     entityId: '23',
            //     entityType: 'person',
            //     metadata: [],
            //     metadataSchema: {keys:['Name'], types: [['text']]},
            //     callback: (data, mode, callback) => {},
            //     mode: 'create',
            //     theme: 'vertical',
            // })

            dialog.setAcceptFunction( () => {
                dialog.hide()
                dialog.destroy()
            })
        })
    }

    makePasswordForm(selector, inputId) {

        this.password1Selector = "#" + inputId
        this.password2Selector = "#password2"

        $(selector).html(
            `<form data-toggle="validator" role="form" id="theChangePasswordForm">
        <!-- Password -->
        <div class="form-group has-feedback">
            <input type="password" 
               class="form-control" 
               id=${inputId}
               name="password1"
               data-minlength="8"
               maxlength="16"
               placeholder="Password (8-16 characters)" required>
            <div class="help-block with-errors"></div>
        <!-- Password confirmation -->
            <input type="password" 
                   class="form-control" 
                   id="password2"
                   name="password2"
                   data-match=${this.password1Selector}
                   data-match-error="Passwords do not match"
                   placeholder="Confirm" required>
            <div class="help-block with-errors"></div>
        </div></form>`)
    }

    makeDateForm(selectorId, inputId, type) {
        $(selectorId).html(`<p><input type="date" class="form-control" id=${inputId} placeholder=${type} style="padding: unset"></p>`)
    }

    makeYearForm(selectorId, inputId, type) {
        let inputIdBcAd = inputId + "_" + "year_bc_ad"
        let inputIdBcADSelector = "#" + inputIdBcAd

        $(selectorId).html(`<p><input type="text" class="form-control" id=${inputId} placeholder=${type} style="padding: unset">
                                                                    <select class="form-control" id=${inputIdBcAd} style="padding: unset"></p>`)
        $(inputIdBcADSelector).append(`<option>BC</option><option selected>AD</option>`)
    }

    makeYearsRangeForm(selectorId, inputId) {

        let idYearsRangeEnd = inputId + "_years_range_end"
        let idYearsRangeNote = inputId + "_years_range_note"
        let currentYear = new Date().getFullYear()

        $(selectorId).html(`<select class="form-control" id=${inputId} style="padding: unset">`)
        $(selectorId).append(`<p><select class="form-control" id=${idYearsRangeEnd} style="padding: unset"></p>`)
        $(selectorId).append(`<p><textarea class="form-control" rows="2" id=${idYearsRangeNote} placeholder="note"></textarea></p>`)

        let selectorYearsRangeStart = "#" + inputId
        let selectorYearsRangeEnd = "#" + idYearsRangeEnd

        $(selectorYearsRangeStart).append(`<option></option>`)
        $(selectorYearsRangeEnd).append(`<option></option>`)

        for (let i=-1000; i<=currentYear; i++) {
            $(selectorYearsRangeStart).append(`<option>${i}</option>`)
            $(selectorYearsRangeEnd).append(`<option>${i}</option>`)
        }
    }

    makeTextForm(selectorId, inputId, type) {
        $(selectorId).html(
            `<p><input type="text" class="form-control" id=${inputId} placeholder=${type} style="padding: unset"></p>`)
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
        let entityAttrFormId = "#entity_attr" + index + "_form"

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
                    let name = this.getPersonNameById(values[index-1])
                    $(entityAttrFormId).val(name)
                }
                break
            default:
                $(entityAttrFormId).val(values[index-1])
        }
    }

    // Button Setup
    setupSaveButton () {
        this.clearBottomButtons()
        let selector = '#' + this.buttonsSelectorBottom
        $(selector).prepend(
            `<button type="submit" class="btn btn-primary save" id="save-button">Save</button>`)
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
        let selector = '#' + this.buttonsSelectorTop
        $(selector).append(' ')
    }

    makeEditButton(){
        let selector = '#' + this.buttonsSelectorTop
        $(selector).append(
            `<a class="card-link" id="edit_button">Edit</a>`)
        this.makeEditButtonEvent()
    }

    makeCancelButton(){
        let selector = '#' + this.buttonsSelectorTop
        $(selector).append(
            `<a class="card-link" id="cancel_button">Cancel</a>`)
            //`<button type="submit" class="btn btn-primary" id="cancel_button">Cancel</button>`)
            this.makeCancelButtonEvent()
    }

    makeBackButton() {
        if (this.options.backlink !== '') {
            let selector = '#' + this.buttonsSelectorTop
            $(selector).append(
                `<a class="card-link" id="back_button" href = ${this.options.backlink}>Back</a>`)
        }
    }

    clearTopButtons() {
        let selector = '#' + this.buttonsSelectorTop
        $(selector).empty()
    }

    clearBottomButtons() {
        let selector = '#' + this.buttonsSelectorBottom
        $(selector).empty()
    }

    makeSaveButtonEvent () {
        $("#save-button").on("click",  () => {

            // Clear Messages
            this.clearErrorMessage()

            // Get Data To Save
            let d = this.getEntityDataByIndex()

            if (this.validateData(d) && this.validatePasswords()) {
                this.makeSpinner(this.buttonsSelectorBottom)
                this.updateEntityData(d.id, d.type, d.values)
                //this.tagEditor.saveTags()
                this.options.callback(this.entity, this.options.mode, () => {
                    this.logSaveAction(this.options.mode)
                    this.setupShowMode()
                })
            }
        })
    }

    makeEditIconEvent(selector) {
        selector = '#' + selector
            $(selector).on("click", () => {
                if (!this.singleEdit) {
                    let keyIndex = selector.match(/\d+/)[0]
                    this.setupTableForDataInput(() => {
                        this.replaceEditWithSaveAndAbortIcons(keyIndex)
                        console.log(`'${this.entity.keys[keyIndex-1]}' in edit mode!`)
                    }, keyIndex)
                    this.options.mode = this.mode.edit
                    this.singleEdit = true
                    this.mutePencilIcons(keyIndex)
                }
            })
    }

    mutePencilIcons(keyIndex) {
        for (let i=1; i<=this.numKeys; i++) {
            let selector = "#entity_attr" + i + "_tableCellButton"
            if (i !== parseInt(keyIndex)) {
                $(selector).html(`<i class="fas fa-pencil-alt" style="color: lightgray"></i>`)
            }
        }
    }

    replaceEditWithSaveAndAbortIcons(i) {
        let cellButtonSelector = "#entity_attr" + i + "_tableCellButton"
        let editButtonSelector = '#entity_attr' + i + '_editButton'
        let cellSaveButton = "entity_attr" + i + "_saveButton"
        let cellAbortButton = "entity_attr" + i + "_abortButton"

        $(editButtonSelector).remove()
        $(cellButtonSelector).html(`<button class="save" id=${cellSaveButton} style="border: transparent; background-color: transparent">
                                                    <i class="fa fa-check" style="color: green"></i></button>`)
        $(cellButtonSelector).append(`<button class="abort" id=${cellAbortButton} style="border: transparent; background-color: transparent">
                                                    <i class="fa fa-times" style="color: darkred; margin-left: 0.15em"></i></button>`)
        this.makeSaveIconEvent(cellSaveButton)
        this.makeAbortIconEvent(cellAbortButton)
    }

    makeAbortIconEvent(selector) {
        selector = '#' + selector
        $(selector).on("click",  () => {
            this.singleEdit = false
            let keyIndex = selector.match(/\d+/)[0]
            this.clearErrorMessage()
            this.setupShowMode()
            this.makeEditIcon(keyIndex)
            console.log(`Editing value for '${this.entity.keys[keyIndex-1]}' aborted.`)
        })
    }

    makeSaveIconEvent(selector) {
        selector = '#' + selector
        $(selector).on("click",  () => {
            let keyIndex = selector.match(/\d+/)[0]
            let cellButtonId = "entity_attr" + keyIndex + "_tableCellButton"
            let value = this.getEntityDataByIndex(keyIndex)
            if (this.validateData(value, keyIndex)) {
                this.clearErrorMessage()
                this.makeSpinner(cellButtonId, '1.25em')
                if (this.entity.types[keyIndex-1].includes('tags')) {
                    //this.tagEditor.saveTags()
                }
                this.entity.values[keyIndex-1] = value // Corresponds to updateEntityData function in global save event
                this.options.callback(this.entity, this.options.mode, () => {
                    this.logSaveAction(this.options.mode)
                    this.singleEdit = false
                    this.setupShowMode()
                    this.makeEditIcon(keyIndex)
                })
                console.log(`Saved value for '${this.entity.keys[keyIndex-1]}'.`)
            }
        })
    }

    makeEditIcon(i) {
        let cellButtonId = "#entity_attr" + i + "_tableCellButton"
        let editAttributeButton = "entity_attr" + i + "_editButton"
        let saveButtonSelector = '#entity_attr' + i + '_saveButton'
        $(saveButtonSelector).remove()
        $(cellButtonId).html(`<button id=${editAttributeButton} style="border: transparent; background-color: transparent"><i
            class="fas fa-pencil-alt" style="color: gray"></i></button>`)
        this.makeEditIconEvent(editAttributeButton)
    }

    makeEditButtonEvent() {
        $("#edit_button").on("click",  () => {

            this.options.mode = this.mode.edit

            // Clear Messages
            this.clearErrorMessage()
            this.setupEditMode()
        })
    }

    makeCancelButtonEvent() {
        $("#cancel_button").on("click",  () => {

            this.options.mode = this.mode.show

            // Clear Messages
            this.clearErrorMessage()
            this.clearBottomButtons()
            this.setupShowMode()
        })
    }

    updateEntityData(id, type, values) {
        this.entity.id = id
        this.entity.type = type
        this.entity.values = values
    }

    getEntityDataByIndex(keyIndex='all') {
        let id = this.entity.id
        let values = []
        let type = this.entity.type

        if (keyIndex === 'all') {
            for (let i = 1; i <= this.numKeys; i++) {
                values.push(this.getEntityDataByType(this.entity.types[i-1], i))
            }
            return {id: id, type: type, values: values}

        } else {
            return this.getEntityDataByType(this.entity.types[keyIndex-1], keyIndex)
        }
    }

    getEntityDataByType (type, keyIndex) {

        let selector = "#entity_attr" + keyIndex + "_form"
        let value = $(selector).val()

        if (type.includes('year')) {
            return this.getDataForYear(selector, value)

        } else if (type.includes('years_range')) {
            return this.getDataForYearsRange(selector, value)

        } else if (type.includes('tags')) {
            return this.tagEditor.getTags()
        } else if (type.includes('person')) {
            let datalist = "#entity_attr" + keyIndex + "_form_list"
            let person_id
            try {
                person_id = $(`${datalist} option[value=${value}]`).attr('id')
            } catch {
                person_id = ''
            }
            return person_id

        } else {
            return value
        }
    }

    getDataForYearsRange(name, value) {
        let years = []
        let idYearsRangeEnd = name + "_years_range_end"
        let idYearsRangeNote = name + "_years_range_note"

        years.push(value)
        years.push($(idYearsRangeEnd).val())
        years.push($(idYearsRangeNote).val())

        return years
    }

    getDataForYear(name, value) {
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
        } else {
            return true
        }
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

            // Get dates of birth and death
            if (key === 'Date of Birth' && value !== '' && this.getValueByKey('Date of Death') !== '') {
                date_birth = value
                date_death = this.getValueByKey('Date of Death')
            }
            if (key === 'Date of Death' && value !== '' && this.getValueByKey('Date of Birth') !== '') {
                date_death = value
                date_birth = this.getValueByKey('Date of Birth')
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
        console.log('Data Type Error!')
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

    returnError(str) {
        str = "&nbsp&nbsp" + str
        $("#errorMessage").html(str)
    }

    clearErrorMessage() {
        $("#errorMessage").empty()
    }

    logSaveAction(mode) {
        if (mode === this.mode.edit) {
            console.log(`Saved alterations of entity with ID ${this.entity.id}.`)
        }
        else if (mode === this.mode.create) {
            console.log(`Created new entity of type '${this.entity.type}' with ID ${this.entity.id}.`)
        }
    }

    // API Calls
    getPeople(callback) {
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
                    callback()
                }

            })
            .fail((status) => {
                console.log(status);
                return false
            })
    }

    // Functions for saving and getting tags to/from global tag cache
    saveTags() {

        // Make API Call
        $.post(urlGen.apiTagEditorSaveTags(), {'tags': this.options.tags})
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

    getAllTags() {

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
                return apiResponse.tags
            })
            .fail((status) => {
                console.log(status)
                return []
            })
    }
}

// Load as global variable so that it can be referenced in the Twig template
window.MetadataEditor = MetadataEditor
