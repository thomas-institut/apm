import { MdeSection } from './MdeSection'
import { EntityData } from '../EntityData/EntityData'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { BasicPredicateEditor } from './BasicPredicateEditor'

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

  }
  async init () {
    await super.init();
    let predicatesToShow = [];

    this.schema.predicates.forEach( (predicateSchema) => {
      let statements = EntityData.getStatementsForPredicate(this.entityData, predicateSchema.id);
      if (predicateSchema.displayIfNotSet || statements.length !== 0) {
        predicatesToShow.push( {
          id: predicateSchema.id,
          label: predicateSchema.label,
          showLogo: predicateSchema.showLogo ?? false,
          showUrl: predicateSchema.showUrl ?? false,
          isRelation: predicateSchema.isRelation ?? false,
        })
      }
    })
    console.log('Vertical List Predicates', predicatesToShow);

    this.bodyElement.addClass(this.getExtraClassForType()).html( predicatesToShow.map( (predicate, index) => {
      return `<div class="mde-predicate mde-predicate-${index}"></div>`;
    }).join(''))

    this.predicateEditors = predicatesToShow.map( (predicate, index) => {
      return new BasicPredicateEditor({
        id: predicate.id,
        containerSelector: `${this.containerSelector} .mde-predicate-${index}`,
        statements: EntityData.getStatementsForPredicate(this.entityData, predicate.id, true),
        label: predicate.label,
        showLogo: predicate.showLogo,
        showUrl: predicate.showUrl,
        isRelation: predicate.isRelation,
        canBeCancelled: this.predicateDefinitions[predicate.id]['canBeCancelled'],
        getEntityName: this.genGetEntityName(),
        getEntityType: this.genGetEntityType()
      })
    })
    await Promise.all(this.predicateEditors.map( (predicateEditor) => { return predicateEditor.init()}));

  }

  run() {
    // nothing for now
  }

  genGetEntityName() {
    return async (id) => {
      let data = await this.apmDataProxy.getEntityData(id);
      return data.name;
    }
  }

  genGetEntityType() {
    return async (id) => {
      let data = await this.apmDataProxy.getEntityData(id);
      return data.type;
    }
  }

  getExtraClassForType() {
    return `mde-predicate-list-${this.listType}`;
  }

}