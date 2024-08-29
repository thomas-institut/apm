import { MdeSection } from './MdeSection'
import { EntityData } from '../EntityData/EntityData'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { BasicPredicateEditor } from './BasicPredicateEditor'
import { urlGen } from '../pages/common/SiteUrlGen'
import { wait } from '../toolbox/FunctionUtil.mjs'
import { WebStorageKeyCache } from '../toolbox/KeyCache/WebStorageKeyCache'
import * as Entity from '../constants/Entity'

const ShowAllLabel =  'Show All';
const ShowActiveDataLabel = 'Show Minimal'
export class PredicateListSection extends MdeSection{

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
    this.memCache = new WebStorageKeyCache();

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
    return predicate.statements.length > 0;
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
      let hiddenClass = this.predicateMustBeDisplayed(predicate) ? '' : 'force-hidden';
      return `<div class="mde-predicate mde-predicate-${index} ${hiddenClass}"></div>`;
    }).join(''))

    this.predicateEditors = this.predicates.map( (predicate, index) => {
      return new BasicPredicateEditor({
        predicateDefinition: predicate.predicateDefinition,
        qualificationDefinitions: this.qualificationDefinitions,
        containerSelector: `${this.containerSelector} .mde-predicate-${index}`,
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
        saveStatement: this.genSaveStatement(predicate)
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
        if (!this.predicateMustBeDisplayed(predicate)) {
          $(`${this.containerSelector} .mde-predicate-${index}`).addClass('force-hidden');
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

  genSaveStatement(predicate) {
    return async (object, qualifications, editorialNote) => {

      this.debug && console.log(`Faking save statement for predicate ${predicate.id}`, [object, qualifications, editorialNote]);
      await wait(500);
      return { success: false, msg: `Save statement for predicate ${predicate.id} not implemented yet`, statements: []}

    }
  }

  getExtraClassForType() {
    return `mde-predicate-list-${this.listType}`;
  }

}