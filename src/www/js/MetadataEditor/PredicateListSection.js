import { MdeSection } from './MdeSection'
import { EntityData } from '../EntityData/EntityData'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { BasicPredicateEditor } from './BasicPredicateEditor'
import { urlGen } from '../pages/common/SiteUrlGen'
import { StatementArray } from '../EntityData/StatementArray'

const ShowAllLabel =  'Show All';
const ShowActiveDataLabel = 'Show Minimal'
export class PredicateListSection extends MdeSection {

  constructor (options) {
    super(options)

    const oc = new OptionsChecker({
      context: 'PredicateListSection',
      optionsDefinition: {
        listType: { type: 'string', default: 'vertical'}
      }
    })
    let cleanOptions = oc.getCleanOptions(options);
    this.listType = cleanOptions.listType;
  }


  async getBootStrapHtml() {
    let showToggleButton = `<a href="#" class="btn btn-sm btn-secondary visibility-toggle-button">${ShowAllLabel}</a>`
    let title = this.title !== '' ? `<div class="mde-section-title">${this.title} <span class="mde-section-list-icons ghost">
        ${showToggleButton}
    </span> </div>` : '';
    return `${title}
    <div class="mde-section-body">
        <div class="mde-section-body-info"></div>
        <div class="mde-section-body-predicates"></div>
    </div>`;
  }

  predicateMustBeDisplayed(predicate) {
    if (predicate.alwaysShow) {
      return true;
    }
    if (predicate.hideEvenIfActive) {
      return false;
    }
    return StatementArray.getCurrentStatements(predicate.statements).length > 0;
  }

  async init () {
    await super.init();
    this.toggleVisibilityButton = $(`${this.containerSelector} .visibility-toggle-button`);
    this.predicates = this.schema.predicates.map ( (predicateSchema) => {
      return {
        id: predicateSchema.id,
        predicateDefinition: this.predicateDefinitions[predicateSchema.id],
        alwaysShow: predicateSchema.alwaysShow ?? false,
        hideEvenIfActive: predicateSchema.hideEvenIfActive ?? false,
        multiLineInput: predicateSchema.multiLineInput ?? false,
        label: predicateSchema.label,
        showLogo: predicateSchema.showLogo ?? false,
        showUrl: predicateSchema.showUrl ?? false,
        isRelation: predicateSchema.isRelation ?? false,
        statements: EntityData.getStatementsForPredicate(this.entityData, predicateSchema.id),
      }
    });


    console.log(`Section '${this.schema.title}' predicates`, this.predicates);
    this.predicatesDiv = $(`${this.containerSelector} .mde-section-body-predicates`);

    this.predicatesDiv.addClass(this.getExtraClassForType()).html( this.predicates.map( (predicate, index) => {
      let classes = [ 'mde-predicate', `mde-predicate-index-${index}`, `mde-predicate-${predicate.id}`];
      if (!this.predicateMustBeDisplayed(predicate)) {
        classes.push('force-hidden');
      }
      classes.push( predicate.predicateDefinition['singleProperty'] ? 'mde-predicate-single' : 'mde-predicate-multi')
      return `<div class="${classes.join(' ')}"></div>`;
    }).join(''))

    this.predicateEditors = this.predicates.map( (predicate, index) => {
      return new BasicPredicateEditor({
        predicateDefinition: predicate.predicateDefinition,
        qualificationDefinitions: this.qualificationDefinitions,
        containerSelector: `${this.containerSelector} .mde-predicate-index-${index}`,
        statements: EntityData.getStatementsForPredicate(this.entityData, predicate.id, true),
        showLabel: predicate.label !== null,
        label: predicate.label ?? '',
        multiLineInput: predicate.multiLineInput,
        logoUrl: predicate.showLogo ? urlGen.entityLogoUrl(predicate.id) : '',
        getObjectUrl: async (object) => {
          if (predicate.isRelation) {
            let data = await this.apmDataProxy.getEntityData(object);
            let url = urlGen.siteEntityPage(data.type, object);
            return url === '' ? null : url;
          } else {
            return predicate.showUrl ? urlGen.entityExternalUrl(predicate.id, object) : null;
          }
        },
        getAllEntitiesForTypes: this.genGetAllEntitiesForTypes(),
        getEntityName: this.genGetEntityName(),
        getEntityType: this.genGetEntityType(),
        saveStatement: this.genSaveStatement(predicate),
        cancelStatement: this.genCancelStatement(predicate),
      })
    })
    await Promise.all(this.predicateEditors.map( (predicateEditor) => { return predicateEditor.init()}));
    this.showingAll = false;
    this.toggleVisibilityButton.on('click', (ev) => {
      ev.preventDefault();
      this.togglePredicateVisibility();
      if (this.showingAll) {
        this.toggleVisibilityButton.html(ShowActiveDataLabel);
      } else {
        this.toggleVisibilityButton.html(ShowAllLabel);
      }
    });
    let listIcons= $(`${this.containerSelector} .mde-section-list-icons`);
    $(`${this.containerSelector} .mde-section-title`).on('mouseenter', () => {
      listIcons.removeClass('ghost');
    }).on('mouseleave', () => {
      listIcons.addClass('ghost');
    })
  }

  togglePredicateVisibility() {
    if (this.showingAll) {
      this.predicates.forEach( (predicate, index) => {
        let predicateContainer =  $(`${this.containerSelector} .mde-predicate-index-${index}`);
        if (this.predicateMustBeDisplayed(predicate)) {
          predicateContainer.removeClass('force-hidden');
        } else {
          predicateContainer.addClass('force-hidden');
        }
      });
    } else {
      $(`${this.containerSelector} .mde-predicate`).removeClass('force-hidden');
    }
    this.showingAll = !this.showingAll;
  }

  run() {
    // nothing for now
  }

  genGetEntityName() {
    return async (id) => {
      return await this.apmDataProxy.getEntityName(id);
    }
  }

  genGetEntityType() {
    return async (id) => {
      return await this.apmDataProxy.getEntityType(id);
    }
  }

  genGetAllEntitiesForTypes() {
    return async (types) => {
      let entities = [];
      for (let i = 0; i < types.length; i++) {
        entities.push(...await this.apmDataProxy.getEntityListForType(types[i]));
      }
      return entities;
    }
  }

  async updateEntityData (newEntityData, updatedPredicates) {
    await super.updateEntityData(newEntityData, updatedPredicates);
    let promises = [];
    for (let index =0; index > this.predicates.length; index++) {
      let predicate = this.predicates[index];
      if (updatedPredicates.includes(predicate.predicateDefinition.id)) {
        let newStatements = EntityData.getStatementsForPredicate(this.entityData, predicate.predicateDefinition.id, true);
        this.predicates[index].statements = newStatements;
        promises.push(this.predicateEditors[index].updateStatements(newStatements));
        let predicateContainer = $(`${this.containerSelector} .mde-predicate-${index}`);
        if (this.predicateMustBeDisplayed(predicate)) {
          predicateContainer.removeClass('force-hidden');
        } else {
          predicateContainer.addClass('force-hidden');
        }
      }
    }
    await Promise.all(promises);
    return true;
  }

  genSaveStatement(predicate) {
    return async (newObject, qualifications, editorialNote, statementId = -1, cancellationNote = '') => {
      let commands = [];
      if (!predicate.predicateDefinition['singleProperty'] && statementId !== -1) {
        // if the predicate is not a single property and there's a statement id,
        // we need to cancel it before creating the new one
        commands.push({
          command: 'cancel',
          statementId: statementId,
          editorialNote: cancellationNote
        });
      }

      commands.push({
        command: 'create',
        subject: this.entityData.id,
        predicate: predicate.id,
        object: newObject,
        qualifications: qualifications,
        editorialNote: editorialNote,
        cancellationNote: cancellationNote
      });

      return await this.doStatementEditCommands(commands, predicate);
    }
  }

  genCancelStatement(predicate) {
    return async (statementId, cancellationNote) => {
      let commands= [{
        command: 'cancel',
        statementId: statementId,
        editorialNote: cancellationNote
      }];
      return await this.doStatementEditCommands(commands, predicate);
    }
  }

  async doStatementEditCommands(commands, predicate) {
    console.log(`Edit statement`, commands);
    let serverResponse = await this.apmDataProxy.apiEntityStatementsEdit(commands);
    console.log('Response from server', serverResponse);
    if (serverResponse.success === false) {
      return { success: false, msg: serverResponse.errorMessage, statements: []}
    }
    let minorProblems = [];
    serverResponse['commandResults'].forEach( (cmdResult) => {
      if (cmdResult['success'] === false) {
        minorProblems.push(cmdResult['errorMessage']);
      }
    })
    let msg = minorProblems.length === 0 ? 'Success' : minorProblems.join('. ');
    // need to get entity data once again
    this.entityData = await this.apmDataProxy.getEntityData(this.entityData.id, true);
    let newStatements = EntityData.getStatementsForPredicate(this.entityData, predicate.id, true);
    let predicateIndex = this.getPredicateIndexFromId(predicate.id);
    if (predicateIndex !== -1) {
      this.predicates[predicateIndex].statements = newStatements;
    }
    await this.options.onEntityDataChange(this.entityData, [ predicate.id ]);
    return { success: true, msg: msg, statements: newStatements,}
  }

  getExtraClassForType() {
    return `mde-predicate-list-${this.listType}`;
  }

  getPredicateIndexFromId(predicateId) {
    for(let index = 0; index < this.predicates.length; index++) {
      if (predicateId === this.predicates[index].predicateDefinition.id) {
        return index;
      }
    }
    return -1;
  }

}