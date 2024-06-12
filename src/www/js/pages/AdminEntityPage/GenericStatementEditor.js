import { ConfirmDialog } from '../common/ConfirmDialog'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { urlGen } from '../common/SiteUrlGen'
import * as Entity from "../../constants/Entity";

const EmptyValue = 'EmptyJ2KMKDy9xIAVR8NB';

export class GenericStatementEditor {
  constructor(options) {
    let oc = new OptionsChecker({
      context: 'GenericStatementEditor',
      optionsDefinition: {
        statementId : { type: 'number', default: null},
        editableParts : { type: 'array', required: true },
        subject: { type: 'number', default: null },
        predicate: { type: 'number', required: true},
        relation: { type: 'boolean', required: true },
        object: { type: 'string', default: null},
        predicateDef: { type: 'object', required: true},
        qualificationDefs: { type: 'object', required: true},
        statementMetadata: { type: 'array', default: []},
        getEntityName: { type: 'function', default: async () => { return ''}},
        getEntityList: { type: 'function', default: async () => { return []}},
        onSuccess: { type: 'function', default: () => { console.log('GenericStatementEditor: success')}}
      }
    });

    this.options = oc.getCleanOptions(options);
    console.log("Options", this.options);
    let [ editSubject, , editObject ] = this.options.editableParts;
    this.editSubject = editSubject;
    this.editObject = editObject;
    this.allowedQualifications = this.options.predicateDef.allowedQualifications ?? [];
    this.canBeCancelled = this.options.predicateDef.canBeCancelled;
    this.initialSubject = this.options.subject ?? '';
    this.initialObject =this.options.object ?? '';
    this.initialQualifications = this.getQualificationsFromStatementMetadata();
    this.emptyValue = EmptyValue + Date.now();

    this.getBodyHtml().then( (bodyHtml) => {
      this.dialog = new ConfirmDialog({
        acceptButtonLabel: 'Save',
        title: this.options.statementId === null ? "Create New Statement" : "Edit Statement",
        body: bodyHtml,
        hideOnAccept: false,
      })
      this.dialog.hideAcceptButton();

      this.subjectInput = editSubject ? $(`${this.dialog.getSelector()} .subject-input`) : null;
      this.objectInput = editObject ?  $(`${this.dialog.getSelector()} .object-input`) : null;
      this.editorialNoteInput = $(`${this.dialog.getSelector()} .editorial-note`);
      this.info = $(`${this.dialog.getSelector()} .info`)
      if (this.subjectInput !== null) {
        this.subjectInput.on('keyup', this.genOnInputChange());
      }
      if (this.objectInput !== null) {
        this.objectInput.on('keyup', this.genOnInputChange());
      }
      this.editorialNoteInput.on('keyup', this.genOnInputChange());

      this.allowedQualifications.forEach( (id) => {
        $(`.qualification-${id}`).on('change', this.genOnInputChange());
      })
      this.genOnInputChange()();
      this.dialog.setAcceptFunction(this.genAcceptFunction());
      this.dialog.show();
    })
  }

  qualificationsAreEqual(arrayA, arrayB) {
    function toObject(qualificationsArray) {
      let obj = {};
      qualificationsArray.forEach( (metadata) => {
        obj[metadata[0]] = metadata[1];
      })
      return obj;
    }

    let debug = false;
    debug && console.log(`Comparing qualifications of lengths`, arrayA.length, arrayB.length);

    if (arrayA === arrayB) {
      return true;
    }

    if (arrayA.length !== arrayB.length) {
      debug && console.log(`Different lengths`);
      return false;
    }

    let objA = toObject(arrayA);
    let objB = toObject(arrayB);

    debug && console.log(`Comparing qualification contents`, objA, objB);

    for(let index = 0; index < this.allowedQualifications.length; index++) {
      let predicate = this.allowedQualifications[index];
      if (objA[predicate] === undefined && objB[predicate] === undefined) {
        continue;
      }
      if (objA[predicate] !== undefined && objB[predicate] === undefined) {
        debug && console.log(`Predicate ${predicate} only defined in A`)
        return false;
      }
      if (objA[predicate] === undefined && objB[predicate] !== undefined) {
        debug && console.log(`Predicate ${predicate} only defined in B`)
        return false;
      }
      if (objA[predicate] !== objB[predicate]) {
        debug && console.log(`Predicate ${predicate} has different values`, objA[predicate], objB[predicate])
        return false;
      }
    }
    debug && console.log(`They're equal`);
    return true;
  }

  getQualificationLabel(id) {
    return this.options.qualificationDefs[id].name ?? '???';
  }

  async getQualificationInput(id, currentValue) {
    let def = this.options.qualificationDefs[id] ?? null;

    if (def === null) {
      return '(!) Undefined';
    }

    let idSpan = `<span class="predicate-help" title="${def.description}"><i class="bi bi-info-circle"></i></span>`;
    let allowedObjectTypes = def['allowedObjectTypes'];

    if (def.type === Entity.tRelation) {
      let allowedEntities = await this.getAllEntitiesForTypes(allowedObjectTypes);
      let optionsHtml =`<option value="${this.emptyValue}"></option>`;
      for (let i = 0; i < allowedEntities.length; i++) {
        let id = allowedEntities[i];
        let selected = id === currentValue ? 'selected' : '';
        optionsHtml += `<option value="${id}" ${selected}>${await this.options.getEntityName(id)}</option>`
      }
      return `<select class="qualification-input qualification-${id}">${optionsHtml}</select> ${idSpan}`
    } else {

      let inputType = 'text';

      if (allowedObjectTypes.length === 1 && allowedObjectTypes[0] === Entity.ValueTypeInteger) {
        inputType = 'number';
      }

      return `<input type="${inputType}" class="qualification-input qualification-${id}" value="${currentValue}"> ${idSpan}`
    }

  }

  async getAllEntitiesForTypes(typeArray){
    let entities = [];
    for (let i = 0; i < typeArray.length; i++) {
      let type = typeArray[i];
      entities.push(...await this.options.getEntityList(type));
    }
    return entities;
  }

  getQualificationsFromStatementMetadata() {
    let qualifications = [];
    this.options.statementMetadata.forEach( (metadata) => {
      let [ id, value] = metadata;
      if (this.allowedQualifications.indexOf(id) !== -1) {
        qualifications.push(metadata);
      }
    })
    return qualifications;
  }

  genOnInputChange() {
    return () => {

      let currentSubject = this.subjectInput !== null ? this.subjectInput.val() : this.initialSubject.toString();
      let currentObject = this.objectInput !== null ? this.objectInput.val() : this.initialObject.toString();
      let currentEditorialNote = this.editorialNoteInput.val().trim();
      let currentQualifications = this.getQualificationsFromInputFields();


      if (currentObject === this.initialObject.toString() && currentSubject === this.initialSubject.toString()
        && this.qualificationsAreEqual(currentQualifications, this.initialQualifications)) {
        this.dialog.hideAcceptButton();
        this.info.html('No change in data');
        return;
      }

      currentSubject = currentSubject.trim();
      currentObject = currentObject.trim();

      // console.log( "Values", [ currentSubject, currentObject, currentEditorialNote ] );
      let inputErrors = [];
      if (currentObject !== null) {
        if (currentObject === '') {
          inputErrors.push('Object cannot be empty');
        } else {
          if (this.options.relation && (isNaN(parseInt(currentObject)) || parseInt(currentObject) <= 0)) {
            inputErrors.push('Object must be a positive integer');
          }
        }

      }
      if (currentSubject !== null) {
        if (currentSubject === '') {
          inputErrors.push('Subject cannot be empty');
        } else {
          if (isNaN(parseInt(currentSubject)) || parseInt(currentSubject) <= 0) {
            inputErrors.push('Subject must be a positive integer');
          }
        }
      }
      if (currentEditorialNote === '') {
        inputErrors.push('Editorial note cannot be empty');
      }
      // console.log('Input errors', inputErrors);
      if (inputErrors.length === 0) {
        this.dialog.showAcceptButton();
        this.info.html('');
      } else {
        this.dialog.hideAcceptButton();
        this.info.html( inputErrors.join('</br>'));
      }
    }
  }

  genAcceptFunction() {
    return () => {
      console.log(`Click on accept `)
      let newSubject = this.subjectInput === null ? this.options.subject : parseInt(this.subjectInput.val().trim());
      let newObject = this.objectInput === null ? this.options.object : this.objectInput.val().trim();
      let newQualifications = this.getQualificationsFromInputFields();

      if (newSubject === undefined || newSubject === null || newSubject === '' || isNaN(newSubject))  {
         this.info("ERROR: Invalid subject");
         console.warn("Accept button click with invalid subject", newSubject);
         return;
      }

      if (newObject === undefined || newObject === null || newObject === '' || (this.options.relation && isNaN(newObject)))  {
        this.info("ERROR: Invalid object");
        console.warn("Accept button click with invalid object", newObject);
        return;
      }

      this.dialog.acceptButton.html("Saving...");
      this.dialog.acceptButton.prop('disabled', true);
      console.log(`Saving new ${this.options.relation ? 'object' : 'value'} [${newObject}], note '${this.editorialNoteInput.val().toString()}'`);

      let commands = [];
      if (this.options.statementId !== null && this.canBeCancelled) {
        commands.push({ command: 'cancel', statementId: this.options.statementId });
      }
      commands.push({
        command: 'create',
        subject: newSubject,
        predicate: this.options.predicate,
        object: this.options.relation ? parseInt(newObject) : newObject.toString(),
        qualifications: newQualifications,
        editorialNote: this.editorialNoteInput.val().trim().toString()
      });

      console.log(`Commands for API`);
      commands.forEach( (command) => {
        console.log(command);
      })
      $.post(urlGen.apiEntityStatementsEdit(), JSON.stringify(commands)).then( (response) => {
        console.log("Success");
        console.log(response);
        if (response.success === true) {
          this.options.onSuccess();
        } else {
          this.info.html("Errors saving data:<br/>&nbsp;&nbsp;" +
            response['commandResults'].map( (r) => { return `[${r.errorCode}] ${r.errorMessage}`})
              .join("<br/>&nbsp;&nbsp;"));
          this.dialog.acceptButton.html("Save");
          this.dialog.acceptButton.prop('disabled', false);
        }
      }).catch( (response) => {
        console.error("Failure", response);
        this.info.html("Error saving data, check console.");
        this.dialog.acceptButton.html("Save");
        this.dialog.acceptButton.prop('disabled', false);
      })
    }
  }

  async getEntityLabel(id) {
    let name = await this.options.getEntityName(id);
    return `${id} ${name === '' ? '' : `[${name}]`}`
  }

  async getBodyHtml() {
    const textAreaCols = 60;

    let introLabel = this.options.statementId === null
      ? ''
      : 'This will cancel the given statement and will create a new one with the edited changes.';

    let objectLabel = this.options.relation ? 'Object' : 'Value';
    let objectInputHtml = this.options.relation && this.initialObject !== '' ? await this.getEntityLabel(this.initialObject) : this.initialObject;
    if (this.editObject) {
      if (this.options.relation) {
        objectInputHtml = `<input type="text" class="object-input" value="${this.initialObject}">`;
      } else {
        objectInputHtml = `<textarea class="object-input" rows="5" cols="${textAreaCols}">${this.initialObject}</textarea>`
      }
    }

    let qualificationsDivs = [];
    for (let i = 0; i < this.allowedQualifications.length; i++) {
      let qp = this.allowedQualifications[i];
      qualificationsDivs.push(`<div class="edit-label">${this.getQualificationLabel(qp)}</div>`);
      let value = this.getQualification(qp, this.options.statementMetadata) ?? '';
      qualificationsDivs.push(`<div>${await this.getQualificationInput(qp, value)}</div>`);
    }

    return `
        <div class="edit-intro">${introLabel}</div>
        <div class="edit-statement-grid">
            <div class="edit-label">Statement Id</div>
            <div>${this.options.statementId ?? '<em>new</em>'}</div>
            <div class="edit-label">Subject</div>
            <div>${this.editSubject ? `<input type="text" class="subject-input" value="${this.initialSubject}">` : 
              await this.getEntityLabel(this.initialSubject)}</div>
            <div class="edit-label">Predicate</div>
            <div>${await this.getEntityLabel(this.options.predicate)}</div>
            <div class="edit-label">${objectLabel}</div>
            <div>${objectInputHtml}</div>
            ${qualificationsDivs.join("\n")}
            <div class="edit-label">Editorial Note</div>
            <div><textarea class="editorial-note" rows="3" cols="${textAreaCols}"></textarea></div>
        </div>
        <div class="info"></div>
`
  }

  getQualificationsFromInputFields() {
    let qualifications = [];
    for (let i = 0; i < this.allowedQualifications.length; i++) {
        let id = this.allowedQualifications[i];
        let qualificationInput = $(`.qualification-${id}`);
        let value = qualificationInput.val().toString();
        if (value !== '' && value !== this.emptyValue) {
          let predicateDef = this.options.qualificationDefs[id];
          if (predicateDef.type === Entity.tRelation) {
            qualifications.push( [ id, parseInt(value)]);
          } else {
            qualifications.push( [ id, value]);
          }
        }
    }
    return qualifications;
  }

  /**
   * Return the object/
   * @param predicate
   * @param statementMetadata
   */
  getQualification(predicate, statementMetadata) {

    let filterQualifications = statementMetadata.filter( (entry) => { return entry[0] === predicate});

    if (filterQualifications.length === 0) {
      return null;
    }

    return filterQualifications[0][1];
  }


}