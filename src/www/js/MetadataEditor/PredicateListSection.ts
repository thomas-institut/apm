import {MdeSection, MdeSectionOptions} from './MdeSection';
import {EntityData} from '@/EntityData/EntityData';
import {BasicPredicateEditor} from './BasicPredicateEditor';
import {urlGen} from '@/pages/common/SiteUrlGen';
import {StatementArray} from '@/EntityData/StatementArray';
import {PredicateDefinitionInterface, StatementDataInterface} from "@/Api/DataSchema/ApiEntity";

const ShowAllLabel = 'Show All';
const ShowActiveDataLabel = 'Show Minimal';

interface PredicateListSectionOptions extends MdeSectionOptions {
  listType: 'horizontal' | 'vertical';
}

interface Predicate {
  id: number;
  predicateDefinition: PredicateDefinitionInterface;
  alwaysShow: boolean;
  hideEvenIfActive: boolean;
  multiLineInput: boolean;
  label: string | null;
  showLogo: boolean;
  showUrl: boolean;
  isRelation: boolean;
  statements: StatementDataInterface[];
}

export class PredicateListSection extends MdeSection {
  private readonly listType: string;
  private toggleVisibilityButton!: JQuery<HTMLElement>;
  private predicates: Predicate[] = [];
  private predicatesDiv!: JQuery<HTMLElement>;
  private predicateEditors: BasicPredicateEditor[] = [];
  private showingAll: boolean = false;

  constructor(options: PredicateListSectionOptions) {
    super(options);

    this.listType = options.listType;
  }


  async getBootStrapHtml() {
    let showToggleButton = `<a href="#" class="btn btn-sm btn-secondary visibility-toggle-button">${ShowAllLabel}</a>`;
    let title = this.title !== '' ? `<div class="mde-section-title">${this.title} <span class="mde-section-list-icons ghost">
        ${showToggleButton}
    </span> </div>` : '';
    return `${title}
    <div class="mde-section-body">
        <div class="mde-section-body-info"></div>
        <div class="mde-section-body-predicates"></div>
    </div>`;
  }

  predicateMustBeDisplayed(predicate: any): boolean {
    if (predicate.alwaysShow) {
      return true;
    }
    if (predicate.hideEvenIfActive) {
      return false;
    }
    return StatementArray.getCurrentStatements(predicate.statements).length > 0;
  }

  async init() {
    await super.init();
    this.toggleVisibilityButton = $(`${this.containerSelector} .visibility-toggle-button`);
    this.predicates = this.schema.predicates.map((predicateSchema: any) => {
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
      };
    });


    console.log(`Section '${this.schema.title}' predicates`, this.predicates);
    this.predicatesDiv = $(`${this.containerSelector} .mde-section-body-predicates`);

    this.predicatesDiv.addClass(this.getExtraClassForType()).html(this.predicates.map((predicate: any, index: number) => {
      let classes = ['mde-predicate', `mde-predicate-index-${index}`, `mde-predicate-${predicate.id}`];
      if (!this.predicateMustBeDisplayed(predicate)) {
        classes.push('force-hidden');
      }
      classes.push(predicate.predicateDefinition['singleProperty'] ? 'mde-predicate-single' : 'mde-predicate-multi');
      return `<div class="${classes.join(' ')}"></div>`;
    }).join(''));

    this.predicateEditors = this.predicates.map((predicate: any, index: number) => {
      return new BasicPredicateEditor({
        predicateDefinition: predicate.predicateDefinition,
        qualificationDefinitions: this.qualificationDefinitions,
        containerSelector: `${this.containerSelector} .mde-predicate-index-${index}`,
        statements: EntityData.getStatementsForPredicate(this.entityData, predicate.id, true),
        showLabel: predicate.label !== null,
        label: predicate.label ?? '',
        multiLineInput: predicate.multiLineInput,
        logoUrl: predicate.showLogo ? urlGen.entityLogoUrl(predicate.id) : '',
        getObjectUrl: async (object: number | string) => {
          if (predicate.isRelation) {
            let data = await this.apiClient.getEntityData(parseInt(object.toString()));
            let url = urlGen.siteEntityPage(data.type, object);
            return url === '' ? null : url;
          } else {
            return predicate.showUrl ? urlGen.entityExternalUrl(predicate.id, object.toString()) : null;
          }
        },
        getAllEntitiesForTypes: this.genGetAllEntitiesForTypes(),
        getEntityName: this.genGetEntityName(),
        getEntityType: this.genGetEntityType(),
        saveStatement: this.genSaveStatement(predicate),
        cancelStatement: this.genCancelStatement(predicate),
      });
    });
    await Promise.all(this.predicateEditors.map((predicateEditor) => {
      return predicateEditor.init();
    }));
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
    let listIcons = $(`${this.containerSelector} .mde-section-list-icons`);
    $(`${this.containerSelector} .mde-section-title`).on('mouseenter', () => {
      listIcons.removeClass('ghost');
    }).on('mouseleave', () => {
      listIcons.addClass('ghost');
    });
  }

  togglePredicateVisibility() {
    if (this.showingAll) {
      this.predicates.forEach((predicate: any, index: number) => {
        let predicateContainer = $(`${this.containerSelector} .mde-predicate-index-${index}`);
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
    return async (id: number) => {
      return await this.apiClient.getEntityName(id);
    };
  }

  genGetEntityType() {
    return async (id: number) => {
      return await this.apiClient.getEntityType(id);
    };
  }

  genGetAllEntitiesForTypes() {
    return async (types: number[]) => {
      let entities = [];
      for (let i = 0; i < types.length; i++) {
        entities.push(...await this.apiClient.getEntityListForType(types[i]));
      }
      return entities;
    };
  }

  async updateEntityData(newEntityData: any, updatedPredicates: number[]) {
    await super.updateEntityData(newEntityData, updatedPredicates);
    let promises = [];
    for (let index = 0; index > this.predicates.length; index++) {
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

  genSaveStatement(predicate: any) {
    return async (newObject: any, qualifications: any, editorialNote: any, statementId = -1, cancellationNote = '') => {
      let commands = [];
      if (!predicate.predicateDefinition['singleProperty'] && statementId !== -1) {
        // if the predicate is not a single property and there's a statement id,
        // we need to cancel it before creating the new one
        commands.push({
          command: 'cancel', statementId: statementId, editorialNote: cancellationNote
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
    };
  }

  genCancelStatement(predicate: any) {
    return async (statementId: number, cancellationNote: string) => {
      let commands = [{
        command: 'cancel', statementId: statementId, editorialNote: cancellationNote
      }];
      return await this.doStatementEditCommands(commands, predicate);
    };
  }

  async doStatementEditCommands(commands: any, predicate: any) {
    console.log(`Edit statement`, commands);
    let serverResponse = await this.apiClient.apiEntityStatementsEdit(commands);
    console.log('Response from server', serverResponse);
    if (serverResponse.success === false) {
      return {success: false, msg: serverResponse.errorMessage, statements: []};
    }
    let minorProblems: string[] = [];
    serverResponse['commandResults'].forEach((cmdResult: any) => {
      if (cmdResult['success'] === false) {
        minorProblems.push(cmdResult['errorMessage']);
      }
    });
    let msg = minorProblems.length === 0 ? 'Success' : minorProblems.join('. ');
    // need to get entity data once again
    this.entityData = await this.apiClient.getEntityData(this.entityData.id, true);
    let newStatements = EntityData.getStatementsForPredicate(this.entityData, predicate.id, true);
    let predicateIndex = this.getPredicateIndexFromId(predicate.id);
    if (predicateIndex !== -1) {
      this.predicates[predicateIndex].statements = newStatements;
    }
    await this.options.onEntityDataChange(this.entityData, [predicate.id]);
    return {success: true, msg: msg, statements: newStatements,};
  }

  getExtraClassForType() {
    return `mde-predicate-list-${this.listType}`;
  }

  getPredicateIndexFromId(predicateId: number) {
    for (let index = 0; index < this.predicates.length; index++) {
      if (predicateId === this.predicates[index].predicateDefinition.id) {
        return index;
      }
    }
    return -1;
  }

}