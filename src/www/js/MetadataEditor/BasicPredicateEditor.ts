import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Tid } from '../Tid/Tid'
import { ApmFormats } from '../pages/common/ApmFormats'
import {Statement, StatementInterface} from '../EntityData/Statement'
import { wait } from '../toolbox/FunctionUtil'
import * as Entity from '../constants/Entity'
import { trimWhiteSpace } from '../toolbox/Util'
import { GetDataAndProcessDialog } from '../pages/common/GetDataAndProcessDialog'
import { ConfirmDialog, EXTRA_LARGE_DIALOG } from '../pages/common/ConfirmDialog'
import { VagueDateValidator } from './VagueDateValidator'
import { NullObjectValidator } from './NullObjectValidator'
import { StatementArray } from '../EntityData/StatementArray'
import {getStringVal} from "../toolbox/UiToolBox";


const SubjectIcon = '<b class="mde-icon">Subject</b>';
const PredicateIcon = '<b class="mde-icon">Predicate</b>'
const ObjectIcon = '<b class="mde-icon">Object</b>'
const ValueIcon = '<b class="mde-icon">Value</b>'


const PredicateInfoIcon = '<i class="bi bi-info-circle"></i>';
const PredicateResetIcon = '<i class="bi bi-arrow-counterclockwise"></i>'

const EmptyJqueryElement = $('');

interface StatementElements {
  qualificationHelpIcons: any;
  qualificationPredicateResets: any;
  qualificationInputs: any;
  statusDiv: JQuery<HTMLElement>;
  editCancelButton: JQuery<HTMLElement>;
  editSaveButton: JQuery<HTMLElement>;
  cancellationNoteInput: JQuery<HTMLElement>;
  noteInput: JQuery<HTMLElement>;
  attributeValueInput: JQuery<HTMLElement>;
  objectInput: JQuery<HTMLElement>;
  objectElement: JQuery;
  editElement: JQuery;
  iconsSpan: JQuery;
  editButton: JQuery;
  cancelButton: JQuery;
  infoButton: JQuery;
}

export class BasicPredicateEditor {
  private readonly debug: boolean;
  private options: any;
  private readonly containerSelector: any;
  private readonly predicateDefinition: any;
  private readonly id: number;
  private readonly label: string;
  private readonly name: string;
  private allowedQualifications: number[];
  private statements: any[];
  private currentStatements: any[];
  private readonly currentModes: string[];
  private readonly isRelation: boolean;
  private readonly getEntityName: any;
  private readonly getEntityType: any;
  private readonly saveStatement: any;
  private readonly selectEmptyValue: string;
  private statementElements: StatementElements[] = [];
  currentMode: string = 'show'
  private fakeNewStatementId: number;


  /**
   * Constructs a new BasicPredicateEditor.
   *
   * A BasicPredicateEditor operates on a specific subject entity and a specific predicate for which 0 or more
   * statements can be given.
   *
   *
   * Options:
   *   * __predicateDefinition__: the predicate's definition, as given the by APM's entity system (required)
   *   * __qualificationsDefinition__: qualification definitions in an object with qualification predicates as keys
   *   (required)
   *   * __containerSelector__: the JQuery selector for the editor (required)
   *   * __statements__: an array of statements with the given predicate (required)
   *   * __showLabel__: if false, no label will be shown. Default: true.
   *   * __label__: label to show if *showLabel* is true. If empty or not given, the predicate's name from the
   *       predicateDefinition will be used
   *   * __logoUrl__: if present and not an empty string, the url of a logo that will be displayed instead of the
   *       label. The label will be used as the alternate text for a html IMG element.
   *   * __getObjectUrl__: an async function that takes the predicate's object and returns a URL to display. If not given
   *       or if the function returns null, no URL will be displayed.
   *   * __initialMode__: the editor's initial mode, 'show' or 'edit'. Default: 'show'.
   *   * __readOnly__: if true, the editor does not show edit and delete buttons. Default: false.
   *   * __getEntityName__: an async function that takes an entity id and returns the entity's name
   *   * __getEntityType__: an async function that takes an entity id and returns the entity's type
   *   * __getAllEntitiesForTypes__: an async function that takes an array of entity types and returns all entities
   *       with those types.
   *   * __saveStatement__: an async function that saves a new statement optionally (but normally) cancelling a
   *       previous one. It must accept the following parameters:
   *       * newObject: the new object or value
   *       * editorialNote: an editorialNote
   *       * qualifications: array of [ qualificationPredicate, qualificationObject] pairs,
   *       * statementId: the id of the statement to be cancelled, if < 0 no cancellation is done
   *       * cancellationNote: a note for the cancellation, required is statementId > 0
   *       It must return an object with the save operation result, an error message if necessary and a
   *       new array of statements for the predicate:  *{ success: true|false, msg: string, statements: array}*
   *   * __cancelStatement__: an async function that takes a statement id and returns an object with the result
   *       of the cancellation operation as in *saveStatement*
   * @param options
   */
  constructor (options:any) {


    const oc = new OptionsChecker({
      context: 'BasicPredicateEditor',
      optionsDefinition: {
        predicateDefinition: {
          type: 'object',
          required: true,
        },
        qualificationDefinitions : {
          type: 'object', required: true
        },
        containerSelector: { type: 'string', required: true},
        statements: { type: 'Array', required: true},
        showLabel: {type: 'boolean', default: true},
        label: { type: 'string', default: ''},
        logoUrl: { type: 'string', default: ''},
        multiLineInput: { type: 'boolean', default: false},
        getObjectUrl: { type: 'function', default: async (object: number) => {
          this.debug && console.log('Fake get object url', object);
          return null;
        }},
        initialMode: { type: 'string', default: 'show'},
        readOnly: { type: 'boolean', default: false},
        getEntityName: { type: 'function', default: async (id: number) => {
          this.debug && console.log(`Faking get entity name for entity ${id}`);
          return `[${Tid.toBase36String(id)}]`
        }},
        getEntityType: { type: 'function', default: async (id:number) => {
          this.debug && console.log(`Faking get entity type for entity ${id}`);
          return -1
        }},
        getAllEntitiesForTypes: {
          type: 'function', default: async (typeArray : number[]): Promise<number[]> => {
            this.debug && console.log(`Faking get all entities for types`, typeArray);
            return [];
          }
        },
        saveStatement: { type: 'function', default: async (newObject: any, qualifications: any, editorialNote: any, statementId = -1, cancellationNote = '') => {
          this.debug && console.log(`Faking save statement`, [ newObject,qualifications, editorialNote, statementId, cancellationNote]);
          await wait(500);
          return { success: false, msg: 'Save statement not implemented yet', statements: []}
        }},
        cancelStatement: { type: 'function', default: async (statementId: any, cancellationNote: any) => {
          this.debug && console.log(`Faking cancel statement`, [ statementId, cancellationNote]);
          await wait(500);
          return { success: false, msg: 'Cancel statement not implemented yet'}}
        }}
    })
    this.options = oc.getCleanOptions(options);
    this.containerSelector = this.options.containerSelector;
    this.predicateDefinition = this.options.predicateDefinition;
    this.id = this.predicateDefinition.id
    this.label = this.options.label;
    this.name = this.predicateDefinition.name;
    this.allowedQualifications = this.predicateDefinition.allowedQualifications ?? [];
    this.statements = this.options.statements;
    this.currentStatements = this.getCurrentStatements(this.statements);
    this.currentModes = [];
    this.isRelation = this.predicateDefinition.type === Entity.tRelation;
    this.getEntityName = this.options.getEntityName;
    this.getEntityType = this.options.getEntityType;
    this.saveStatement = this.options.saveStatement;
    this.debug = true;
    this.selectEmptyValue = `ev-${ (Math.floor(Math.random() * 100000000)).toString(36) }-${this.id}`;
    this.fakeNewStatementId = Date.now() + this.id + Math.floor(Math.random() * 10000);
  }


  /**
   * @private
   */
  getCurrentStatements(statements: StatementInterface[]) {
    return StatementArray.getCurrentStatements(statements)
      .filter( (statement) => {
        return statement.predicate === this.id;
      });
  }

  async init(mode: string|null = null) {
    if (mode === null) {
      mode = this.options.initialMode;
    }
    $(this.containerSelector).html('').html(await this.getHtml());
    let displayedStatements = [ ...this.currentStatements];
    if (this.currentStatements.length === 0) {
      displayedStatements = [ this.getNewStatementSkeletonObject()];
    }
    if (!this.options.predicateDefinition['singleProperty']) {
      displayedStatements.push( this.getNewStatementSkeletonObject());
    }
    this.statementElements = [];
    await Promise.all(displayedStatements.map( async (statement) => {
      this.statementElements[statement.id] = {
        objectElement: $(`${this.containerSelector} .mde-predicate-object-${statement.id}`),
        editElement:  $(`${this.containerSelector} .bpe-predicate-edit-${statement.id}`),
        iconsSpan: $(`${this.containerSelector} .mde-predicate-icons-${statement.id}`),
        editButton: $(`${this.containerSelector} .edit-button-${statement.id}`),
        cancelButton: $(`${this.containerSelector} .cancel-button-${statement.id}`),
        infoButton: $(`${this.containerSelector} .info-button-${statement.id}`),
        qualificationHelpIcons: {},
        qualificationInputs: {},
        qualificationPredicateResets: {},
        statusDiv: EmptyJqueryElement,
        noteInput: EmptyJqueryElement,
        cancellationNoteInput: EmptyJqueryElement,
        objectInput: EmptyJqueryElement,
        attributeValueInput: EmptyJqueryElement,
        editSaveButton: EmptyJqueryElement,
        editCancelButton: EmptyJqueryElement,

      }
      let elements = this.statementElements[statement.id];
      elements.objectElement.on('mouseenter', () => {
        elements.iconsSpan.removeClass('ghost');
      });
      elements.objectElement.on('mouseleave', () => {
        elements.iconsSpan.addClass('ghost');
      });

      elements.editButton.on('click', this.genOnClickEditButton(statement));
      elements.infoButton.on('click', this.genOnClickInfoButton(statement));
      // @ts-ignore
      elements.infoButton.popover({
        content: await this.getInfoPopoverHtml(statement),
        html: true,
        title: await this.getInfoPopoverTitle(),
      }).on('mouseenter', () => {
        // @ts-ignore
        elements.infoButton.popover('show');
      }).on('mouseleave', () => {
        // @ts-ignore
        elements.infoButton.popover('hide');
      });
      elements.cancelButton.on('click', this.genOnClickCancelStatementButton(statement));
      this.currentModes[statement.id] = 'show';
    }));

    if (mode === 'edit') {
      for (let i = 0; i < this.currentStatements.length; i++) {
        await this.switchToEditMode(this.currentStatements[i]);
      }
    }
  }

  /**
   *
   * @param {object}statement
   * @return {Promise<void>}
   */
  async switchToEditMode(statement:StatementInterface): Promise<void> {
    this.statementElements[statement.id].editElement
      .removeClass('hidden bpe-predicate-edit-relation')
      .addClass('bpe-predicate-edit-attribute')
      .html(await this.getEditModeHtml(statement, this.isRelation));

    let selectorPrefix = `${this.containerSelector} .bpe-predicate-edit-${statement.id}`;
    if (this.isRelation) {
      this.statementElements[statement.id].objectInput = $(`${selectorPrefix} .object-input`);
    } else {
      this.statementElements[statement.id].attributeValueInput = $(`${selectorPrefix} .value-input`);
    }

    this.statementElements[statement.id].noteInput = $(`${selectorPrefix} .note-input`);
    this.statementElements[statement.id].cancellationNoteInput = $(`${selectorPrefix} .cancellation-note-input`);
    this.statementElements[statement.id].editSaveButton = $(`${selectorPrefix} .edit-save-button`);
    this.statementElements[statement.id].editCancelButton = $(`${selectorPrefix} .edit-cancel-button`);
    this.statementElements[statement.id].statusDiv = $(`${selectorPrefix} div.status-div`);
    this.statementElements[statement.id].qualificationInputs = {};
    this.statementElements[statement.id].qualificationPredicateResets = {};
    this.statementElements[statement.id].qualificationHelpIcons = {};
    this.allowedQualifications.forEach( (predicate) => {
      this.statementElements[statement.id].qualificationInputs[predicate] =
        $(`${selectorPrefix} .qualification-input-${predicate}`);

      this.statementElements[statement.id].qualificationPredicateResets[predicate] =
        $(`${selectorPrefix} .bpe-predicate-reset-${predicate}`);

      this.statementElements[statement.id].qualificationHelpIcons[predicate] =
        $(`${selectorPrefix} .bpe-predicate-help-${predicate}`);

    });

    if (this.isRelation) {
      this.statementElements[statement.id].objectInput
        .val(statement.object === -1 ? this.selectEmptyValue : statement.object)
        .on('change', this.genOnInputChangeEditMode(statement, 'relation'));

    } else {
      this.statementElements[statement.id].attributeValueInput.val(statement.object);
      this.statementElements[statement.id].attributeValueInput.on('keyup', this.genOnInputChangeEditMode(statement, 'attribute'));
    }
    this.statementElements[statement.id].noteInput.on('keyup', this.genOnInputChangeEditMode(statement, 'note'));
    this.statementElements[statement.id].cancellationNoteInput.on('keyup', this.genOnInputChangeEditMode(statement, 'note'));
    this.allowedQualifications.forEach( (predicate) => {
      this.statementElements[statement.id].qualificationInputs[predicate]
        .on('change', this.genOnInputChangeEditMode(statement, 'qualification', predicate))
        .on('keyup', this.genOnInputChangeEditMode(statement, 'qualification', predicate));
      this.statementElements[statement.id].qualificationPredicateResets[predicate]
        .on('click', this.genOnClickQualificationPredicateReset(statement, predicate));
      this.statementElements[statement.id].qualificationHelpIcons[predicate].popover({trigger: 'hover'});

    })
    this.statementElements[statement.id].editCancelButton.on('click', (ev) => {
      ev.preventDefault();
      this.switchToShowMode(statement);
    });
    this.statementElements[statement.id].editSaveButton.on('click', this.genOnClickEditSaveButton(statement));
    this.statementElements[statement.id].iconsSpan.addClass('hidden');

    if (this.isRelation) {
      // TODO: add object chooser controls
    } else {




      this.currentMode = 'edit';
    }
  }

  genOnClickEditSaveButton(statement: StatementInterface) {
    return async (ev: any) => {
      ev.preventDefault();
      let dataFromForm = this.getDataFromForm(statement, this.isRelation);
      let validationResult = this.validateData(statement, dataFromForm, this.isRelation);
      if (validationResult !== true) {
        console.log(`Click on save button with invalid data: ${validationResult}`);
        return;
      }
      this.statementElements[statement.id].statusDiv.html(`<span class="text-warning">Saving...</span>`);
      this.statementElements[statement.id].editSaveButton.addClass('disabled');
      let qualifications: any[] = [];
      this.allowedQualifications.forEach( (predicate) => {
        if (dataFromForm.qualifications[predicate] !== '' && dataFromForm.qualifications[predicate] !== -1 ) {
          qualifications.push([ predicate, dataFromForm.qualifications[predicate]]);
        }
      });

      let statementId = statement.id === this.getFakeNewStatementId() ? -1 : statement.id;
      let result = await this.saveStatement(dataFromForm.object, qualifications, dataFromForm.editorialNote, statementId, dataFromForm.cancellationNote);
      if (result.success) {
        this.statementElements[statement.id].editSaveButton.addClass('hidden');
        this.statementElements[statement.id].statusDiv.html(`Data saved successfully`);
        await wait(500);
        console.log(`New statements`, result['statements']);
        await this.updateStatements(result['statements']);
      }  else {
        this.statementElements[statement.id].statusDiv.html(`<span class="text-danger">Error saving data:<br/><b>${result.msg}</b>`);
        await wait(1000);
        this.statementElements[statement.id].editSaveButton.removeClass('disabled');
      }
    }
  }

  async updateStatements(newStatements : StatementInterface[]) {
    this.statements = newStatements;
    this.currentStatements = this.getCurrentStatements(this.statements);
    await this.init('show');
    this.currentMode = 'show';
  }

  genOnClickQualificationPredicateReset(statement : StatementInterface, predicate: number) {
    return () => {
      this.resetQualificationPredicate(statement, predicate);
      this.processInputChange(statement,'qualification', predicate);
    }
  }

  resetQualificationPredicate(statement :StatementInterface, predicate: number) {
    let def = this.options.qualificationDefinitions[predicate] ?? null;

    if (def === null) {
      console.warn(`Undefined predicate ${predicate}`);
      return;
    }

    let defaultValue = '';

    if (def.type === Entity.tRelation) {
      defaultValue = this.selectEmptyValue;
    }
    let currentQualificationValue = Statement.getMetadataPredicate(statement, predicate) ?? defaultValue;
    this.statementElements[statement.id].qualificationInputs[predicate].val(currentQualificationValue);
  }

  getQualificationValueFromForm(statement: StatementInterface, predicate: number) {
    let val = this.statementElements[statement.id].qualificationInputs[predicate].val() ?? '';
    if (this.options.qualificationDefinitions[predicate].type === Entity.tRelation) {
      if (val === `${this.selectEmptyValue}`) {
        val = -1;
      } else {
        val = parseInt(val);
      }
    } else {
      val = trimWhiteSpace(val);
    }
    return val;
  }

  getDataFromForm(statement: StatementInterface, isRelation: boolean): any {
    let qualifications: any = {};
    this.allowedQualifications.forEach( (predicate) => {
      qualifications[predicate] = this.getQualificationValueFromForm(statement, predicate);
    });
    let cancellationNote = '';
    if (statement.id !== this.getFakeNewStatementId()) {
      cancellationNote = trimWhiteSpace(getStringVal(this.statementElements[statement.id].cancellationNoteInput));
    }
    if (isRelation) {
      let objectSelectionVal = getStringVal(this.statementElements[statement.id].objectInput);
      let object = parseInt(objectSelectionVal.toString());
      if (objectSelectionVal === this.selectEmptyValue) {
        object = -1;
      }
      return {
        object: object,
        editorialNote: trimWhiteSpace(getStringVal(this.statementElements[statement.id].noteInput)),
        cancellationNote: cancellationNote,
        qualifications: qualifications
      };
    } else {
      return {
        object: trimWhiteSpace(getStringVal(this.statementElements[statement.id].attributeValueInput)),
        editorialNote: trimWhiteSpace(getStringVal(this.statementElements[statement.id].noteInput)),
        cancellationNote: cancellationNote,
        qualifications: qualifications
      };
    }
  }

  getValidatorForType(type: number) {
    switch (type) {
      case Entity.ValueTypeVagueDate:
        return new VagueDateValidator();

      default:
        return new NullObjectValidator();
    }
  }

  getCurrentQualificationsObject(statement: StatementInterface) {
    let currentQualifications: any = {};
    this.allowedQualifications.forEach( (predicate) => {
      currentQualifications[predicate] = this.options.qualificationDefinitions[predicate].type === Entity.tRelation ? -1 : '';
    })
    statement.statementMetadata.filter( (md) => {
      let [ predicate, ] = md;
      return this.allowedQualifications.includes(predicate);
    }).forEach( (md) => {
      let [predicate, object] = md;
      currentQualifications[predicate] = object;
    });

    return currentQualifications;
  }

  validateData(statement: StatementInterface, data: any , isRelation: boolean): string|boolean {
    let currentObject = statement.object;
    let currentQualifications = this.getCurrentQualificationsObject(statement);

    let noChanges = true;
    if (data.object !== currentObject) {
      noChanges = false;
    }

    for (let qualificationPredicate in currentQualifications) {
      let currentQualificationObject = currentQualifications[qualificationPredicate];
      let qualificationObjectInData = data['qualifications'][qualificationPredicate]
      if (qualificationObjectInData !== currentQualificationObject) {
        noChanges = false;
        if (parseInt(qualificationPredicate) === Entity.pObjectSequence) {
          if (parseInt(qualificationObjectInData) <= 0) {
            return 'Sequence number must be greater than 0';
          }
        }
      }
    }

    if (noChanges) {
      return ``;
    }

    if (isRelation && data.object === -1) {
      return `Object cannot be empty`;
    }
    if (!isRelation && data.object === '') {
      return `Value cannot be empty`;
    }

    if (!isRelation) {
      let validatorResults = (this.predicateDefinition['allowedObjectTypes'] ?? []).map( (type: number): string => {
        return this.getValidatorForType(type).validateObject(data.object).join('. ')
      }).join('. ');
      if (validatorResults !== '') {
        return validatorResults;
      }
    }

    if (statement.id !== this.getFakeNewStatementId()) {
      if (data.cancellationNote.length === 0) {
        return `Enter a cancellation note`;
      }
      if (data.cancellationNote.length < 5 ) {
        return `Cancellation note too short`;
      }
    }

    if (data.editorialNote.length === 0) {
      return `Enter an editorial note`;
    }
    if (data.editorialNote.length < 5 ) {
      return `Editorial note too short`;
    }
    return true;
  }



  genOnInputChangeEditMode(statement:StatementInterface, type:string, predicate:number|null  = null) {
    return (ev: any):void => {
      ev.preventDefault();
      this.processInputChange(statement, type, predicate)
    }
  }

  processInputChange(statement : StatementInterface, type:string, predicate: number|null):void {
    let dataFromForm = this.getDataFromForm(statement, this.isRelation);
    if (type === 'qualification' && predicate !== null) {
      if (this.getCurrentQualificationsObject(statement)[predicate] !== this.getQualificationValueFromForm(statement, predicate)) {
        this.statementElements[statement.id].qualificationPredicateResets[predicate].removeClass('hidden');
      } else {
        this.statementElements[statement.id].qualificationPredicateResets[predicate].addClass('hidden');
      }
    }
    let validationResult = this.validateData(statement, dataFromForm, this.isRelation);
    if (validationResult !== true) {
      this.statementElements[statement.id].statusDiv.html(`<span class="text-danger">${validationResult}</span>`);
      this.statementElements[statement.id].editSaveButton.addClass('disabled');
    } else {
      this.statementElements[statement.id].statusDiv.html('');
      this.statementElements[statement.id].editSaveButton.removeClass('disabled');
    }
  }

  switchToShowMode(statement: StatementInterface) {
    this.statementElements[statement.id].editElement.html('')
      .addClass('hidden')
      .removeClass('bpe-predicate-edit-attribute bpe-predicate-edit-relation');
    this.statementElements[statement.id].iconsSpan.removeClass('hidden');
    this.currentMode = 'show';
  }

  /**
   *
   * @param statement
   * @param {boolean}isRelation
   * @return {Promise<string>}
   */
  async getEditModeHtml(statement: StatementInterface, isRelation:boolean): Promise<string> {
    let inputHtml;
    if (isRelation) {
      inputHtml =  await this.getObjectInput(statement);
    } else {
      inputHtml = this.options.multiLineInput ?
        `<textarea class="value-input" placeholder="Enter value here" rows="3"></textarea>` :
        `<input type="text" class="value-input">`;
    }


    let allowedQualifications = this.predicateDefinition.allowedQualifications ?? [];
    let qualificationDivs = (await Promise.all(allowedQualifications.map( async (qualificationPredicate:number) => {
      let currentQualificationValue = Statement.getMetadataPredicate(statement, qualificationPredicate);
      return `<div>
           ${await this.options.getEntityName(qualificationPredicate)}
        </div>
        <div>
            ${await this.getQualificationInput(qualificationPredicate, currentQualificationValue)}
        </div>`
    }))).join('');
    let cancellationDivs = '';
    if (statement.id !== this.getFakeNewStatementId()) {
      cancellationDivs = `<div>Cancellation Note</div><div><textarea class="cancellation-note-input" 
            placeholder="Explain why the current data is wrong" cols="20" rows="3"></textarea></div>`
    }

    return `<!-- Statement ${statement.id} Edit (Attribute) -->
        <div style="grid-column-end: span 2"><h1>${this.getPredicateName()}</h1><div>${this.predicateDefinition.description}</div></div>
        <div>Value</div><div>${inputHtml}</div>
        ${qualificationDivs}
        ${cancellationDivs}
        <div>Editorial Note</div><div><textarea class="note-input" placeholder="Enter a note about the new data, e.g. its source" cols="20" rows="3"></textarea></div>
        <div></div> <div class="status-div"></div> 
        <div></div><div><a class="btn btn-sm btn-secondary edit-save-button disabled">Save</a>
        <a class="btn btn-sm btn-secondary edit-cancel-button">Cancel</a></div>`
  }

  async getObjectInput(statement: StatementInterface) {
    // TODO: change to search entities
    let allowedObjectTypes = this.predicateDefinition['allowedObjectTypes'];
    let allowedEntities = await this.options.getAllEntitiesForTypes(allowedObjectTypes);

    let allowedEntityData = [];
    for (let i = 0; i < allowedEntities.length; i++) {
      let id = allowedEntities[i];
      allowedEntityData.push( { id: id, name: await this.options.getEntityName(id) });
    }

    allowedEntityData.sort( (a,b) => { if (a.name < b.name) return -1; if (a.name > b.name) return 1; return 0;} );

    let optionsHtml =`<option value="${this.selectEmptyValue} ${statement.object === -1 ? 'selected': ''}"></option>`;
    for (let i = 0; i < allowedEntityData.length; i++) {
      let id = allowedEntityData[i].id;
      let name = allowedEntityData[i].name;
      let selected = id === statement.object ? 'selected' : '';
      optionsHtml += `<option value="${id}" ${selected}>${name}</option>`
    }
    return `<select class="object-input">${optionsHtml}</select>`
  }

  async getQualificationInput(id: number, currentValue: any) {
    let def = this.options.qualificationDefinitions[id] ?? null;

    if (def === null) {
      return '(!) Undefined';
    }

    let idSpan = `<span class="bpe-predicate-help bpe-predicate-help-${id}" data-content="${def.description}">${PredicateInfoIcon}</span>`;
    let resetSpan = `<span class="bpe-predicate-reset bpe-predicate-reset-${id} hidden" title="Click to reset">${PredicateResetIcon}</span>`;
    let allowedObjectTypes = def['allowedObjectTypes'];

    if (def.type === Entity.tRelation) {
      let allowedEntities = await this.options.getAllEntitiesForTypes(allowedObjectTypes);
      let allowedEntityData = [];
      for (let i = 0; i < allowedEntities.length; i++) {
        let id = allowedEntities[i];
        allowedEntityData.push( { id: id, name: await this.options.getEntityName(id) });
      }

      allowedEntityData.sort( (a,b) => { if (a.name < b.name) return -1; if (a.name > b.name) return 1; return 0;} );

      let optionsHtml =`<option value="${this.selectEmptyValue}"></option>`;
      for (let i = 0; i < allowedEntityData.length; i++) {
        let id = allowedEntityData[i].id;
        let name = allowedEntityData[i].name;
        let selected = id === currentValue ? 'selected' : '';
        optionsHtml += `<option value="${id}" ${selected}>${name}</option>`
      }
      return `<select class="qualification-input qualification-input-${id}">${optionsHtml}</select> ${idSpan} ${resetSpan}`
    } else {
      let inputType = 'text';

      if (allowedObjectTypes.length === 1 && allowedObjectTypes[0] === Entity.ValueTypeInteger) {
        inputType = 'number';
      }


      return `<input type="${inputType}" class="qualification-input qualification-input-${id}" value="${currentValue ?? ''}"> ${idSpan} ${resetSpan}`
    }

  }


  genOnClickEditButton(statement: StatementInterface) {
    return (ev:any) => {
      ev.preventDefault();
      if (this.currentMode === 'edit') {
        console.warn("Already in edit mode!");
        return;
      }
      this.switchToEditMode(statement).then(() => {});
    }
  }

  genOnClickInfoButton(statement: StatementInterface) {
    return async (ev: any) => {
      ev.preventDefault();
      // @ts-ignore
      this.statementElements[statement.id].infoButton.popover('hide');
      if (this.statements.length === 0) {
        return;
      }
      let subject = this.statements[0].subject;
      let bodyHeader = `<div>Subject: ${Tid.toBase36String(subject)} (${await this.getEntityName(subject)})</div>
        <div>Predicate: ${this.id} (${this.getPredicateName()})</div><div>${this.predicateDefinition.description}</div>`;

      let dialog = new ConfirmDialog({
        cancelButtonLabel: 'Close',
        body: `${bodyHeader} <div class="bpe-statement-history-div">${await this.getStatementHistoryTableByOps()}</div>`,
        size: EXTRA_LARGE_DIALOG,
        title: 'Statement History',
      });

      dialog.hideAcceptButton();
      dialog.show();
    }
  }


  getStatementById(statementId: StatementInterface) {
    for(let i = 0;  i < this.statements.length; i++) {
      if (this.statements[i].id === statementId) {
        return this.statements[i];
      }
    }
    return null;
  }

  async getStatementHistoryTableByOps() {
    let history = StatementArray.getEditHistory(this.statements).map( (event, index) => {
      event.n = index+1;
      return event;
    }).reverse();

    let qualificationTrs = (await Promise.all(this.allowedQualifications.map( async (q) => {
      return `<th>${await this.getEntityName(q)}</th>`;
    }))).join('');

    let tableRows = (await Promise.all(history.map( async (event) => {
      let statement = this.getStatementById(event.statementId);
      let qualificationTds =  (await Promise.all(this.allowedQualifications.map( async (q) => {
        let qualificationHtml = '';
        let qualificationObject = Statement.getMetadataPredicate(statement, q);
        if (qualificationObject !== null) {
          qualificationHtml = await this.getEntityName(qualificationObject);
        }
        return `<td>${qualificationHtml}</td>`;
      }))).join('');
      let author = event.operation === 'creation' ? Statement.getAuthor(statement) : Statement.getCancellationAuthor(statement);
      let editorialNote = event.operation === 'creation' ? Statement.getEditorialNote(statement) : Statement.getCancellationEditorialNote(statement);
      if (editorialNote === null) {
        editorialNote = '<i>None left</i>'
      }
      let objectString= this.isRelation ?
        `${Tid.toBase36String(statement.object)} (${await this.getEntityName(statement.object)})` :
        `<span class="text-monospace">${statement.object}</span>`;
      let trClasses = [ `event-${event.operation}`];
      if (statement['cancellationId'] !== -1) {
        trClasses.push('cancelled-statement');
      } else {
        trClasses.push('active-statement');
      }
      return `<tr class="${trClasses.join(' ')}">
            <td>${event.n}</td>
            <td>${ApmFormats.time(event.timestamp)}</td>
            <td>${event.operation === 'creation' ? 'Statement' : 'Cancellation'}</td>
            <td>${event.statementId}</td>
             <td>${objectString}</td>
            ${qualificationTds}
            <td>${await this.getEntityName(author)}</td>
            <td>${editorialNote}</td>
</tr>`

    }) )).join('');
    return `<table class="bpe-statement-history"><tr>
            <th>N</th>
            <th>Time</th>
            <th>Event</th>
            <th>Statement ID</th>
            <th>Value</th>
            ${qualificationTrs}
            <th>Author</th>
            <th>Editorial Note</th>
            
        </tr>${tableRows}</table>`

  }



  // async getStatementHistoryTable() {
  //   let qualificationTrs = (await Promise.all(this.allowedQualifications.map( async (q) => {
  //     return `<th>${await this.getEntityName(q)}</th>`;
  //   }))).join('');
  //   return `<table class="bpe-statement-history">
  //       <tr>
  //           <th>Statement ID</th>
  //           <th>Time</th>
  //           <th>Value</th>
  //           ${qualificationTrs}
  //           <th>Author</th>
  //           <th>Editorial Note</th>
  //           <th>Cancelled</th>
  //       </tr>` +
  //     (await Promise.all(this.statements.map( async (statement) => {
  //       let author = Statement.getAuthor(statement);
  //       let qualificationTds =  (await Promise.all(this.allowedQualifications.map( async (q) => {
  //         let qualificationHtml = '';
  //         let qualificationObject = Statement.getMetadataPredicate(statement, q);
  //         if (qualificationObject !== null) {
  //           if (typeof q === 'string') {
  //             qualificationHtml = q;
  //           } else {
  //             qualificationHtml = await this.getEntityName(qualificationObject);
  //           }
  //         }
  //         return `<td>${qualificationHtml}</td>`;
  //       }))).join('');
  //       let cancellationInfo = '';
  //       if (statement['cancellationId'] !== -1) {
  //         let note = Statement.getCancellationEditorialNote(statement) ?? '';
  //         cancellationInfo = `${ApmFormats.time(Statement.getCancellationTimestamp(statement))}<br/>
  //            ${await this.getEntityName(Statement.getCancellationAuthor(statement))}<br/>
  //            ${note !== '' ? `Note: ${note}` : '<i>No note left</i>'}`
  //       }
  //       return `<tr ${statement['cancellationId'] !== -1 ? 'class="cancelled-statement"' : ''}>
  //           <td>${statement.id}</td>
  //           <td>${ApmFormats.time(Statement.getEditTimestamp(statement))}</td>
  //           <td>${await this.getObjectHtml(statement)}</td>
  //           ${qualificationTds}
  //           <td>${await this.getEntityName(author)}</td>
  //           <td>${Statement.getEditorialNote(statement) ?? '<i>None</i>'}</td>
  //           <td>${cancellationInfo}</td>
  //          </td>`
  //   }))).join('') + `</table>`;
  // }

  genOnClickCancelStatementButton(statement: StatementInterface) {
    return async (ev: any) => {
      ev.preventDefault();
      let dialog = new GetDataAndProcessDialog({
        title: "Do you want to cancel this data statement?",
        processButtonLabel: 'Yes, do it',
        cancelButtonLabel: "Close this dialog without doing anything",
        validateData: (data: string) => {
          return trimWhiteSpace(data).length < 4 ? `<span class="text-warning">Too few characters, enter 5 or more</span>` : true;
        },
        getDataFromForm: (dialogSelector: string) => {
          return $(`${dialogSelector} .cancel-note-input`).val();
        },
        processData: async (data: any, infoArea: any) => {
          console.log(`Cancellation Note`, data);
          infoArea.html("Cancelling statement");
          let result = await this.options.cancelStatement(statement.id, data);
          if (result.success) {
            infoArea.html(`Statement cancelled successfully`);
            await wait(1000);
            console.log(`New statements`, result['statements']);
            this.statements = result['statements'];
            this.currentStatements = this.getCurrentStatements(this.statements);
            await this.init('show');
            this.currentMode = 'show';
            return result;
          } else {
            infoArea.html(`<span class="text-danger">Error cancelling data statement: ${result.msg}`);
            return result;
          }
        },
        getBodyHtml: async () => {
          let statementInfo = `${await this.getStatementCard(statement)}`

          return `<div class="bpe-cancellation-confirm-statement">${statementInfo}</div>
            <p>Cancellation Note:</br>
            <textarea class="cancel-note-input" placeholder="Enter a reason for this cancellation" cols="40" rows="3"></textarea>
            </p>`
        },
        hideOnAccept: false,
      });
      await dialog.process();
    }
  }

  getEditButtonHtml(statement: StatementInterface, addNew = false) {
    let icon = addNew ? 'Add New' : '<i class="bi bi-pencil"></i>';
    let title = addNew ? 'Click to add new statement' : 'Click to edit';

    let classes = [ 'edit-button', `edit-button-${statement.id}`];
    if (addNew) {
      classes.push(...['btn', 'btn-sm', 'btn-secondary']);
    }
    return `<a href="#" class="${classes.join(' ')}" title="${title}">${icon}</a>`
  }

  getCancellationButtonHtml(statement: StatementInterface) {
    return `<a href="" class="cancel-button cancel-button-${statement.id}" title="Click to cancel this statement"><i class="bi bi-trash"></i></a>`;
  }

  getInfoButtonHtml(statement: StatementInterface) {
    return `<a href="" class="info-button info-button-${statement.id}" ><i class="bi bi-info-circle"></i></a>`;
  }

  getFakeNewStatementId() : number {
    return this.fakeNewStatementId;
  }


  getNewStatementSkeletonObject(): StatementInterface {
    return {
      predicate: this.id,
      id: this.getFakeNewStatementId(),
      object: this.isRelation ? -1 : '',
      statementMetadata: [],
      subject: -1,
      cancellationId: -1,
      cancellationMetadata: []
    }
  }

  getStatementDivsForNewStatement(addNew = false) {
    let allowedQualifications = this.options.predicateDefinition.allowedQualifications ?? [];
    let statement = this.getNewStatementSkeletonObject();
    let editButton = !this.options.readOnly ? this.getEditButtonHtml(statement, addNew) : '';
    let infoButton = !addNew ? this.getInfoButtonHtml(statement) : '';
    let objectTitle = addNew ? '' : 'No data';
    let ghostClass = 'ghost';
    return allowedQualifications.map( () => { return '<div></div>'}).join('') +
      `<div>
            <div class="mde-predicate-object mde-predicate-object-${statement.id}"><i>${objectTitle}</i> 
                <span class="mde-predicate-icons mde-predicate-icons-${statement.id} ${ghostClass}">${editButton} ${infoButton}</span>
            </div>
            <div class="bpe-predicate-edit bpe-predicate-edit-${statement.id} hidden"></div>
        </div>`;
  }

  /**
   * @return {Promise<string>}
   * @private
   */
  async getHtml(): Promise<string> {
    let allowedQualifications = this.options.predicateDefinition.allowedQualifications ?? [];
    let newStatementDivsPre = '';
    if (this.currentStatements.length === 0) {
      newStatementDivsPre = this.getStatementDivsForNewStatement();
    }
    let statementDivs = (await Promise.all(this.currentStatements.map( async (statement) => {
      let editButton = !this.options.readOnly ? this.getEditButtonHtml(statement) : '';
      let cancellationButton = this.currentStatements.length !== 0 && !this.options.readOnly && this.predicateDefinition.canBeCancelled ?
         this.getCancellationButtonHtml(statement) : '';
      let infoButton = this.getInfoButtonHtml(statement);
      let iconsSpan = `<span class="mde-predicate-icons mde-predicate-icons-${statement.id} ghost">${editButton} ${cancellationButton} ${infoButton}</span>`
      let qualificationDivs = (await Promise.all(allowedQualifications.map(
        async (qualificationPredicate : number) => {
          let qualificationObject = null;
          for(let i = 0; i < statement.statementMetadata.length; i++) {
            if (statement.statementMetadata[i][0] === qualificationPredicate) {
              qualificationObject = statement.statementMetadata[i][1];
              break;
            }
          }
          let objectText = qualificationObject === null ? '' :
            typeof qualificationObject === 'string' ? qualificationObject : await this.options.getEntityName(qualificationObject);
          return `<div class="bpe-qualification bpe-qualification-${qualificationPredicate}">${objectText}</div>`;
      }))).join('');
      return `${qualificationDivs}
        <div>
            <div class="mde-predicate-object mde-predicate-object-${statement.id}">${await this.getObjectHtml(statement)} ${iconsSpan}</div>
             <div class="bpe-predicate-edit bpe-predicate-edit-${statement.id} hidden"></div>
        </div>`
    }))).join('');
    let newStatementDivsPost = '';
    if (this.currentStatements.length !== 0 && !this.options.predicateDefinition['singleProperty']) {
      newStatementDivsPost = this.getStatementDivsForNewStatement(true);
    }
    let gridTemplateColumns = [ ...this.options.predicateDefinition.allowedQualifications ?? [], -1].map ( (q) => {
      return q === -1 ? 'auto' : 'max-content';
    }).join(' ');
    let style = `display:grid; grid-template-columns: ${gridTemplateColumns};`;
    return `<div class="mde-predicate-label">${this.getLabelHtml()}</div>
        <div class="mde-statement-divs" style="${style}">
            ${newStatementDivsPre}
            ${statementDivs}
            ${newStatementDivsPost}
        </div>`;
  }

  /**
   * @return {Promise<string>}
   * @private
   */
  async getObjectHtml(statement: StatementInterface): Promise<string> {
    if (statement === null) {
      return `<i>No data</i>`;
    }
    let objectUrl = await this.options.getObjectUrl(statement.object);
    if (this.isRelation) {
      let objectType = await this.getEntityType(statement.object);
      let objectName = await this.getEntityName(statement.object);
      if (objectType === -1) {
        return objectName;
      }
      return objectUrl === null ? objectName :
        `<a href="${objectUrl}" title="Click to open ${objectName}'s page">${objectName}</a>`
    }
    return objectUrl === null ? statement.object.toString() :
      `<a href="${objectUrl}" target="_blank" title="Click to visit ${this.getPredicateName()} page">
        ${statement.object} <i class="bi bi-link-45deg"></i></a>`;
  }


  getPredicateName() {
    return this.label === '' ? this.name : this.label;
  }
  /**
   * @private
   */
  getLabelHtml() {
    if (!this.options.showLabel) {
      return '';
    }
    let name = this.getPredicateName();
    let label = `<b>${name}</b>:`;
    return this.options.logoUrl !== '' ? `<img src="${this.options.logoUrl}" class="mde-predicate-logo" alt="${name}" title="${name}">` : label;
  }

  async getInfoPopoverTitle() {
    let predicateName = this.getPredicateName();
    let predicateDescription = this.predicateDefinition['description'];
    if (predicateName === predicateDescription) {
      predicateDescription = '';
    }
    return `<div>${predicateName}</div><div class="bpe-popover-subtitle">${predicateDescription}</div>`;
  }

  async getInfoPopoverHtml(statement: StatementInterface) {
    if (statement.id === this.getNewStatementSkeletonObject().id) {
      if (this.currentStatements.length === 0) {
        if (this.statements.length === 0) {
          return `<div><i>Never been edited</i></div>`
        } else {
          return `<div class="bpe-popover-more-info-line">There are cancelled statements. Click info icon to see full list</div>`
        }

      }
      if (this.currentStatements.length <= this.statements.length) {
        // previous edits
        return `
           <div><i>No active data</i></div>
           <div class="bpe-popover-more-info-line">Cancelled statements available. Click info icon to see full list</div>`
      }
      console.warn(`Inconsistent number of statements for new statement: current ${this.currentStatements.length}, all ${this.statements.length}`,
        this.currentStatements, this.statements);
      return `<div><i>Inconsistent data</i></div>`;
    }

    let html = await this.getStatementCard(statement, [ 'bpe-statement-popover'], [ false, false, true]);
    if (this.currentStatements.length < this.statements.length) {
      html += `<div class="bpe-popover-more-info-line">There are cancelled statements. Click info icon to see full list</div>`
    }
    return html;
  }

  async getStatementCard(statement: StatementInterface, extraClasses: string[] = [], includeParts = [ true, true, true]) {
    if (statement.id === this.getNewStatementSkeletonObject().id) {
      return '';
    }
    let [ includeSubject, includePredicate, includeObject ] = includeParts;
    let author= Statement.getAuthor(statement);
    let authorName = await this.getEntityName(author);
    let editorialNote = Statement.getEditorialNote(statement) ?? '<i>No editorial note left</i>';
    let time = ApmFormats.time(Statement.getEditTimestamp(statement));
    let subjectArea = '';
    let predicateArea = '';
    let objectArea = '';

    if (includeSubject) {
      subjectArea = `<div>${SubjectIcon}</div><div>${Tid.toBase36String(statement.subject)} (${await this.getEntityName(statement.subject)})</div>`
    }

    if (includePredicate) {
      predicateArea = `<div>${PredicateIcon}</div><div>${statement.predicate} (${await this.getEntityName(statement.predicate)})</div>`
    }

    if (includeObject) {
      let objectString= this.isRelation ?
        `${Tid.toBase36String(parseInt(statement.object.toString()))} (${await this.getEntityName(statement.object)})` :
        `<span class="bpe-popover-value">${statement.object}</span>`;
      objectArea = `<div>${this.isRelation ? ObjectIcon : ValueIcon}</div><div>${objectString}</div>`;
    }

    let qualificationDivs = (await Promise.all(statement.statementMetadata.map( async (statementMetadataItem) => {
      let [ metadataPredicate, object] = statementMetadataItem;
      if ([Entity.pStatementAuthor, Entity.pStatementTimestamp, Entity.pStatementEditorialNote].indexOf(metadataPredicate) !== -1) {
        return '';
      }
      let metadataPredicateName = await this.options.getEntityName(metadataPredicate);
      let objectText = typeof object === 'string' ? object : await this.options.getEntityName(object);
      return `<div>${metadataPredicateName}</div><div>${objectText}</div>`;
    }))).join('');


    return `<div class="mde-statement-card ${extraClasses.join(' ')}">
        ${subjectArea} ${predicateArea} ${objectArea}
        ${qualificationDivs}
        <div><i class="bi bi-chat"></i></div>
        <div>${editorialNote}</div>
        <div><i class="bi bi-person-badge"></i></div>
        <div>${authorName}</div>
        <div><i class="bi bi-clock"></i></div>
        <div>${time}</div>
        <div><i class="bi bi-file-spreadsheet"></i></div>
        <div>${statement.id}</div>
       </div>`
  }

}