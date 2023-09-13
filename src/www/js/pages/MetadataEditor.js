import {OptionsChecker} from "@thomas-inst/optionschecker";

export class MetadataEditor {

    constructor(options) {

        let optionsDefinition = {
            containerSelector: { type:'string', required: true},
            entityId: {type:'number', required: true},
            entityType: {type:'string', required: false},
            mode: {type:'string', required: true},
            theme: {type:'string', required: true}
        }

        let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "MetadataEditor"})
        this.options = oc.getCleanOptions(options)

        // Fill container with editor structure
        this.makeEditor(options.containerSelector)

        // Globals
        this.entity = {id: '', type: '', attributes: [], values: [], types: []}
        this.schemes = {types: [], attributes: [], placeholders: []}
        this.numAttributes = 0
        this.newId = 0
        this.notfirstquery = false
        this.state = {create: 'c', edit: 'e'}

        // Selectors
        //this.thead = $('#tableHead')
        //this.tbody = $('#tableBody')
        this.entity_id_cell = $('#entity_id')
        this.entity_type_cell = $('#entity_type')
        this.buttons =  $('#buttons')

        // Api urls
        this.urlGen = new ApmUrlGenerator('')
        this.apiUrls = {
            getData: this.urlGen.apiMetadataEditorGetData(),
            saveData: this.urlGen.apiMetadataEditorSaveData(),
            createEntity: this.urlGen.apiMetadataEditorCreateEntity(),
            getIdForNewEntity: this.urlGen.apiMetadataEditorGetIdForNewEntity(),
            getDataSchemesForEntityTypes: this.urlGen.apiMetadataEditorGetDataSchemesForEntityTypes()
        };

        // Setup get and create button as initial state of the metadata editor
        this.getMetadataByEntityId(this.options.entityId,() => {
            this.makeTable()
            this.setupTableForDataInput(this.state.edit, () => {
                this.setupSaveAndCancelButton(this.state.edit)
                console.log(`Metadata for entity with ID ${this.entity.id} can now be edited.`)
            })
        })
    }

    // FUNCTIONS
    // Buttons
    clearButtons() {
        this.buttons.empty()
    }

    setupGetAndCreateButton() {
        this.buttons.append
        (`<button type="button" id="get_button" name="Get" style="background-color: white; padding: unset">Get Metadata</button>
              <button type="button" id="create_button" name="Create" style="background-color: white; padding: unset">Create New Entity</button>`)

        //this.makeGetButtonEvent()
        this.makeCreateButtonEvent()
    }

    setupGetEditAndCreateButton () {
        this.buttons.append
        (`<button type="button" id="get_button" name="Get" style="background-color: white; padding: unset">Get Metadata</button>
                <button type="button" id="edit_button" name="Edit" style="background-color: white; padding: unset">Edit Metadata</button>
                <button type="button" id="create_button" name="Create" style="background-color: white; padding: unset">Create New Entity</button>`)

        //this.makeGetButtonEvent()
        this.makeEditButtonEvent()
        this.makeCreateButtonEvent()
    }

    setupSaveAndCancelButton (mode) {
        this.buttons.append(
            `<button type="button" id="save_button" name="Save" style="background-color: white; padding: unset">Save</button>`)
        // <button type="button" id="cancel_button" name="Save" style="background-color: white; padding: unset">Cancel</button>

        this.makeSaveButtonEvent(mode)
        //this.makeCancelButtonEvent(mode)
    }

    // makeGetButtonEvent () {
    //     $("#get_button").on("click",  () => {
    //         this.clearButtons()
    //         this.clearEntityData()
    //         this.getMetadataByEntityId(5,() => {
    //             this.makeTable()
    //             this.showMetadata()
    //             this.setupGetEditAndCreateButton()
    //             console.log(`Metadata for entity with ID ${this.entity.id} are being displayed.`)
    //         })
    //     })
    // }

    makeCreateButtonEvent() {
        $("#create_button").on("click", () => {
            this.clearButtons()
            this.clearIdCell()
            this.setupTableForDataInput(this.state.create, () => {
                this.setupSaveAndCancelButton(this.state.create)
                console.log('Metadata for new entity can now be set.')
            })
        })
    }

    makeEditButtonEvent () {
        $("#edit_button").on("click", () => {
            this.clearButtons()
            this.setupTableForDataInput(this.state.edit, () => {
                this.setupSaveAndCancelButton(this.state.edit)
                console.log(`Metadata for entity with ID ${this.entity.id} can now be edited.`)
            })
        })
    }

    makeSaveButtonEvent (mode) {
        $("#save_button").on("click",  () => {

            // Get Data To Save
            let d = this.getEntityDataToSave(mode)

            if (this.dataTypesAreCorrect(d)) {
                // Make Api Call
                if (mode === this.state.edit) {
                    this.saveMetadata(d.id, d.type, d.values)
                }
                else {
                    this.createEntity(d.id, d.type, d.values)
                }

                this.updateEntityData(d.id, d.type, d.values)
                //this.showMetadata()
                //this.clearButtons()
                this.clearErrorMessage()
                //this.setupGetEditAndCreateButton()
            }
            else {
                this.returnDataTypeError()
            }
        })
    }

    makeCancelButtonEvent (mode) {
        $("#cancel_button").on("click",  () => {
            this.clearButtons()
            this.clearErrorMessage()
            this.clearTableCells()
            this.removeTableRows()
            if (mode === this.state.create) {
                this.clearEntityData()
                this.setupGetAndCreateButton()
                console.log('Creation of new entity was canceled.')
            }
            else {
                this.makeTable()
                this.showMetadata()
                this.setupGetEditAndCreateButton()
                console.log(`Editing of entity with ID ${this.entity.id} was canceled.`)
            }
        })
    }

    // Table Manipulation
    makeEditor(container) {
        container = "#" + container
        $(container).html(
            `<br>
                            <table id="metadataTable"></table>
                            <br>
                            <div id="buttons"></div>
                            <br>
                            <div id="confirmationMessage"></div>
                            <br>
                            <div id="errorMessage"></div>
                            <br>`)
    }

    makeTable() {

        this.removeTableRowsIfNotFirstQuery()
        this.makeTableRows()
        this.makeTableCells()

        // Get Selectors for id and type cell
        this.entity_id_cell = $('#entity_id')
        this.entity_type_cell = $('#entity_type')
    }

    makeTableRows() {
        if (this.options.theme === 'horizontal') {
            $('#metadataTable').append(`<tr id="row1"></tr><tr id="row2"></tr>`)
        }
        else if (this.options.theme === 'vertical') {
            for (let i=1; i<=this.numAttributes; i++) {
                let id = "row" + i
                $('#metadataTable').append(`<tr id=${id}></tr>`)
            }
        }
    }

    makeTableCells () {
        // this.thead.append(`
        //         <th style="border: 0.5px solid black">Entity ID</th>
        //         <th style="border: 0.5px solid black">Type</th>`)
        //
        // this.tbody.append(`
        //         <td style="border: 0.5px solid black">
        //             <div id="entity_id">
        //                 -
        //             </div>
        //         </td>
        //         <td style="border: 0.5px solid black">
        //             <div id="entity_type">
        //                 -
        //             </div>
        //         </td>`)

        if (this.options.theme === 'horizontal') {
            for (let i = 1; i <= this.numAttributes; i++) {

                let cellId = "entity_attr" + i
                $('#row1').append(`<th>${this.entity.attributes[i-1]}</th>`)

                $('#row2').append(`<td><div id=${cellId}></div></td>`)
            }
        } else if (this.options.theme === 'vertical') {
            for (let i = 1; i <= this.numAttributes; i++) {

                let row = "#row" + i
                let cellId = "entity_attr" + i
                let attributeName = this.entity.attributes[i-1] + "&emsp;&emsp;"

                $(row).append(`<th>${attributeName}</th>
                               <td><div id=${cellId}></div></td>`)
            }
        }
    }

    showMetadata () {
        this.clearTableCells()
        this.entity_id_cell.append(this.entity.id)
        this.entity_type_cell.append(this.entity.type)
        for (let i=1; i<=this.numAttributes; i++) {
            let id = "#entity_attr" + i
            $(id).append(this.entity.values[i-1])
        }
    }

    clearTableCells() {
        this.clearIdCell()
        this.entity_type_cell.empty()
        for (let i=1; i<=this.numAttributes; i++) {
            let id = "#entity_attr" + i
            $(id).empty()
        }
    }

    setupTableForDataInput(mode, callback) {

        if (mode === this.state.create) {
            this.clearTableCells()
            this.removeTableRows()
            this.getDataSchemesForEntityTypes(() => {
                this.makeEntityFitToTypeSchema()
                this.makeTable()
                this.getIdForNewEntity(() => {
                    this.showNewId()
                })
                this.setupTypeSelector()
                this.setupSelectorOptions()
                this.setupAttributesForms()
                callback()
            })
        }
        else {
            this.setupAttributesForms()
            this.fillAttributesFormsWithValues()
            callback()
        }
    }

    setupAttributesForms() {
        for (let i=1; i<=this.numAttributes; i++) {
            let selectorId = "#entity_attr" + i
            let inputId = "entity_attr" + i + "_form"
            let placeholder = this.entity.types[i-1]
            $(selectorId).html(
                `<input type="text" id=${inputId} placeholder=${placeholder} style="padding: unset">`)
        }
    }

    setupTypeSelector() {
        this.entity_type_cell.html(
            `<select id="entity_type_select">`)

        $("#entity_type_select").on("change", () => {
            let value = $("#entity_type_select").val()
            this.clearTableCells()
            this.removeTableRows()
            this.makeEntityFitToTypeSchema(value)
            this.makeTable()
            this.setupTypeSelector()
            this.setupSelectorOptions(value)
            this.setupAttributesForms()
            this.showNewId()
            console.log(`Adjusted table to chosen entity type "${value}".`)
        });
    }

    setupSelectorOptions(value=this.schemes.types[0]) {
        let selector = $('#entity_type_select')
        $.each(this.schemes.types, (i, type) => {
            selector.append($('<option>', {
                value: type,
                text : type
            }))
        })
        selector.val(value)
    }

    fillAttributesFormsWithValues() {
        for (let i=1; i<=this.numAttributes; i++) {
            let id = "#entity_attr" + i + "_form"
            $(id).val(this.entity.values[i-1])
        }
    }

    removeTableRows() {
        for (let i=0; i<this.numAttributes; i++) {
            let row = "#row" + i
            $(row).remove()
        }
    }

    removeTableRowsIfNotFirstQuery() {
        if (this.notfirstquery) {
            this.removeTableRows()
        }
        else {
            this.notfirstquery = true
        }
    }

    showNewId () {
        this.clearIdCell()
        this.entity_id_cell.html(`${this.newId}`)
    }

    clearIdCell() {
        this.entity_id_cell.empty()
    }

    returnDataTypeError() {
        console.log('Data Type Error!')
        $("#errorMessage").html(`The types of the given data do not match with the type scheme of the desired entity type!\n
                The type scheme for entities of type '${this.entity.type}' is: ${this.entity.types}.\nPlease try again.`)
    }

    clearErrorMessage() {
        $("#errorMessage").empty()
    }

    confirm(str) {
        $("#confirmationMessage").html(str)
    }

    // Entity Data Management
    clearEntityData () {
        this.entity = {id: '', type: '', attributes: [], values: [], types: []}
    }

    updateEntityData(id, type, values) {
        this.entity.id = id
        this.entity.type = type
        this.entity.values = values
    }

    getEntityDataToSave(mode) {
        let id
        let type
        let values = []

        if (mode === this.state.create) {
            id = this.newId
            type = $('#entity_type_select').val()
        }
        else {
            id = this.entity.id
            type = this.entity.type
        }

        for (let i=1; i<=this.numAttributes; i++) {
            let name = "#entity_attr" + i + "_form"
            values.push($(name).val())
        }

        return {id: id, type: type, values: values}
    }

    makeEntityFitToTypeSchema(type=this.schemes.types[0]) {
        let i = this.schemes.types.indexOf(type)
        this.entity.attributes = this.schemes.attributes[i]
        this.entity.types = this.schemes.placeholders[i]
        this.numAttributes = this.entity.attributes.length
    }

    dataTypesAreCorrect (d) {

        let index = 0
        for (let value of d.values) {
            let type = this.getDataType(value)
            if (type !== this.entity.types[index]) {
                return false
            }
            else {
                index++
            }
        }

        return true
    }

    getDataType(value) {

        let type

        if (this.isMail(value)) {
            type = 'email'
        }
        else if (this.containsNumber(value)) {

            if (this.containsOnlyNumbers(value)) {
                type = 'number'
            }
            else {
                type = 'date'
            }
        }
        else {
            type = 'text'
        }

        return type
    }

    isMail(str) {
        return /.+@.+\..+/.test(str)
    }

    containsNumber(str) {
        return /\d/.test(str);
    }

    containsOnlyNumbers(str) {
        return /^\d+$/.test(str);
    }

    // Api Calls
    getMetadataByEntityId (id, callback) {

        let apiData = {id: id}

        // Make API request
        $.post(this.apiUrls.getData, apiData).done((apiResponse) => {

            // Catch errors
            if (apiResponse.status !== 'OK') {
                console.log(`Error in query for metadata of entity with ID ${id}!`);
                if (apiResponse.errorData !== undefined) {
                    console.log(apiResponse.errorData);
                }
                errorMessageDiv.html(`Error while getting metadata, please report to technical administrators.`)
                    .removeClass('text-error');
                return;
            }

            console.log(`Got metadata for entity with ID ${id}`)
            console.log(apiResponse);

            // Fill data-object with relevant data
            this.entity.id = apiResponse.data.id
            this.entity.type = apiResponse.data.type
            Object.entries(apiResponse.data.currentMetadata).forEach((data, index) => {
                this.entity.values[index] = data[1]
            })
            Object.entries(apiResponse.data.metadataSchema).forEach((data, index) => {
                this.entity.attributes[index] = data[0]
                this.entity.types[index] = data[1]
            })

            // Store number of values
            this.numAttributes = this.entity.attributes.length
            console.log(`Entity has ${this.numAttributes} attributes.`)

            callback()

            return true
        })

        return false
    }

    getDataSchemesForEntityTypes(callback) {

        $.post(this.apiUrls.getDataSchemesForEntityTypes).done((apiResponse) => {

            // Catch errors
            if (apiResponse.status !== 'OK') {
                console.log(`Error in query for entity types!`);
                if (apiResponse.errorData !== undefined) {
                    console.log(apiResponse.errorData);
                }
                errorMessageDiv.html(`Error while getting entity types, please report to technical administrators.`)
                    .removeClass('text-error');
                return;
            }

            console.log(apiResponse);
            console.log(`Got type data.`)

            this.schemes.types = []
            Object.entries(apiResponse.data).forEach((element, index) => {
                this.schemes.types.push(element[0])
                this.schemes.attributes[index] = []
                this.schemes.placeholders[index] = []
                Object.entries(element[1]).forEach((item) => {
                    this.schemes.attributes[index].push(item[0])
                    this.schemes.placeholders[index].push(item[1])
                })
            })

            callback()

            return true
        })
    }

    getIdForNewEntity(callback) {

        $.post(this.apiUrls.getIdForNewEntity).done((apiResponse) => {

            // Catch errors
            if (apiResponse.status !== 'OK') {
                console.log(`Error in query for metadata of entity with ID ${id}!`);
                if (apiResponse.errorData !== undefined) {
                    console.log(apiResponse.errorData);
                }
                errorMessageDiv.html(`Error while getting metadata, please report to technical administrators.`)
                    .removeClass('text-error');
                return;
            }

            console.log(apiResponse);
            console.log(`ID for new entity will be ${apiResponse.id}`)

            this.newId = apiResponse.id
            callback()

            return true
        })
    }

    saveMetadata (id, type, values) {

        let apiData = {id: id, type: type, values: values}
        this.setMetadata(this.apiUrls.saveData, apiData)
    }

    createEntity (id, type, values) {

        let apiData = {id: id, type: type, values: values}
        this.setMetadata(this.apiUrls.createEntity, apiData)
    }

    setMetadata (apiUrl, apiData) {

        $.post(apiUrl, apiData).done((apiResponse) => {

            console.log(apiResponse);

            // Catch errors
            if (apiResponse.status !== 'OK') {
                console.log(`Error in query for metadata of entity with ID ${apiData.id}!`);
                if (apiResponse.errorData !== undefined) {
                    console.log(apiResponse.errorData);
                }
                errorMessageDiv.html(`Error while getting metadata, please report to technical administrators.`)
                    .removeClass('text-error');
            }
            else {

                if (apiUrl === this.apiUrls.createEntity) {
                    this.confirm('Created!')
                    console.log(`Created entity with ID ${apiData.id}`)
                }
                else {
                    this.confirm('Saved!')
                    console.log(`Saved metadata for entity with ID ${apiData.id}`)
                }
            }

        })
    }
}

// Load as global variable so that it can be referenced in the Twig template
window.MetadataEditor = MetadataEditor
