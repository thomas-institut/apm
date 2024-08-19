import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ApmDataProxy } from '../pages/common/ApmDataProxy'
import * as SectionType from '../defaults/MetadataEditorSchemata/SectionType'
import { EditableHeaderSection } from './EditableHeaderSection'
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
          case SectionType.EditableHeader:
            return new EditableHeaderSection({
              apmDataProxy: this.options.apmDataProxy,
              predicateDefinitions: this.typeData['predicateDefinitions'],
              qualificationDefinitions: this.typeData['qualificationDefinitions'],
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
            });

          case SectionType.VerticalList:
            return new PredicateListSection({
              apmDataProxy: this.options.apmDataProxy,
              predicateDefinitions: this.typeData['predicateDefinitions'],
              qualificationDefinitions: this.typeData['qualificationDefinitions'],
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
              listType: 'vertical'
            });

          case SectionType.HorizontalList:
            return new PredicateListSection({
              apmDataProxy: this.options.apmDataProxy,
              predicateDefinitions: this.typeData['predicateDefinitions'],
              qualificationDefinitions: this.typeData['qualificationDefinitions'],
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
              listType: 'horizontal'
            });

          default:
            return new MdeSection({
              apmDataProxy: this.options.apmDataProxy,
              predicateDefinitions: this.typeData['predicateDefinitions'],
              qualificationDefinitions: this.typeData['qualificationDefinitions'],
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
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

}