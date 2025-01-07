import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ApmDataProxy } from '../pages/common/ApmDataProxy'
import * as SectionType from '../defaults/MetadataEditorSchemata/SectionType'
import { HeaderSection } from './HeaderSection'
import { MdeSection } from './MdeSection'
import { PredicateListSection } from './PredicateListSection'

export class MetadataEditor2 {

  constructor (options) {
    const oc = new OptionsChecker({
      optionsDefinition:  {
        containerSelector: { type:'string', required: true},
        entityDataSchema: {type: 'object', required: true},
        entityData: {type: 'object', required: false, default: {}},
        apmDataProxy: { type: 'object', objectClass: ApmDataProxy, required: true},
        /**
         * an array of string providers identified by name
         * These can be used to insert any custom string in different places in the editor,
         * for example, in the entity's description in a header section
         */
        infoStringProviders: {
          type: 'array',
          elementDefinition: {
            type: 'object',
            objectDefinition: {
              name: { type: 'string', required: true},
              /**
               * an async function that takes an entity id and returns a string
               * e.g.  (id) => { ....;  return 'someString'  }
               */
              provider: { type: 'function', required: true}
            }
          },
          default: []
        }
      },
      context:  "MetadataEditor2"
    });
    this.options = oc.getCleanOptions(options);
    this.containerSelector = this.options.containerSelector;
    this.entityData = this.options.entityData;

    this.getBootstrapHtml().then( async (html) => {
      $(this.options.containerSelector).html(html);
      this.typeData = await this.options.apmDataProxy.getPredicateDefinitionsForType(this.entityData.type);

      this.sections = this.options.entityDataSchema.sections.map( (sectionSchema, sectionIndex) => {
        switch(sectionSchema.type) {
          case SectionType.Header:
            return new HeaderSection({
              apmDataProxy: this.options.apmDataProxy,
              predicateDefinitions: this.typeData['predicateDefinitions'],
              qualificationDefinitions: this.typeData['qualificationDefinitions'],
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
              onEntityDataChange: this.genOnEntityDataChange(sectionIndex),
              getInfoString: this.genGetInfoString()
            });

          case SectionType.VerticalList:
            return new PredicateListSection({
              apmDataProxy: this.options.apmDataProxy,
              predicateDefinitions: this.typeData['predicateDefinitions'],
              qualificationDefinitions: this.typeData['qualificationDefinitions'],
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
              listType: 'vertical',
              onEntityDataChange: this.genOnEntityDataChange(sectionIndex)
            });

          case SectionType.HorizontalList:
            return new PredicateListSection({
              apmDataProxy: this.options.apmDataProxy,
              predicateDefinitions: this.typeData['predicateDefinitions'],
              qualificationDefinitions: this.typeData['qualificationDefinitions'],
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
              listType: 'horizontal',
              onEntityDataChange: this.genOnEntityDataChange(sectionIndex)
            });

          default:
            return new MdeSection({
              apmDataProxy: this.options.apmDataProxy,
              predicateDefinitions: this.typeData['predicateDefinitions'],
              qualificationDefinitions: this.typeData['qualificationDefinitions'],
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
              onEntityDataChange: this.genOnEntityDataChange(sectionIndex)
            });
        }
      })
      await Promise.all( this.sections.map( (section) => { return section.init()}));
      this.sections.forEach( (section) => {
        section.run();
      })

    });
  }

  async getBootstrapHtml() {
    return this.options.entityDataSchema.sections.map( (sectionSchema, sectionIndex) => {
      return `<div class='mde-section mde-section-${sectionIndex} mde-section_type-${sectionSchema.type}'>
         </div>`
    })
  }

  genOnEntityDataChange(sectionIndex) {
    return (newData, updatedPredicates) => {
      return this.onEntityDataChange(newData, updatedPredicates, sectionIndex);
    }
  }

  genGetInfoString() {
    return async (providerName) => {
      console.log(`Getting info string for provider ${providerName}`);
      let providers = this.options.infoStringProviders.filter( (provider) => { return provider.name === providerName});
      if (providers.length === 0) {
        console.log(`Provider ${providerName} is undefined`);
        return null;
      }
      return providers[0]['provider'](this.entityData.id);
    }
  }

  /**
   *
   * @param {{}}newData
   * @param {number[]}updatedPredicates
   * @param {number}originatingSectionIndex
   * @return {Promise<boolean[]>}
   */
  onEntityDataChange(newData, updatedPredicates, originatingSectionIndex) {
    console.log(`New entity data received from section ${originatingSectionIndex}`, updatedPredicates, newData);
    return Promise.all(this.sections.map( (section, index) => {
      if (index !== originatingSectionIndex) {
        return section.updateEntityData(newData, updatedPredicates);
      }
      return true;
    }));

  }

}