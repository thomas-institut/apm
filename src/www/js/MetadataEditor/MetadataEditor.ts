import {OptionsChecker} from '@thomas-inst/optionschecker';
import {ApmApiClient} from '@/Api/ApmApiClient';
import * as SectionType from '@/MetadataEditor/MetadataEditorSchemata/SectionType';
import {HeaderSection} from './HeaderSection';
import {MdeSection} from './MdeSection';
import {PredicateListSection} from './PredicateListSection';
import {EntityDataInterface, PredicateDefinitionsForType} from "@/Api/DataSchema/ApiEntity";
import {SchemaInterface} from "@/MetadataEditor/MetadataEditorSchemata/SchemaInterface";


interface InfoStringProvider {
  name: string;
  provider: (entityId: number) => Promise<string | null>;
}

interface MetadataEditorOptions {
  containerSelector: string;
  entityDataSchema: SchemaInterface;
  entityData: EntityDataInterface;
  apiClient: ApmApiClient;
  infoStringProviders?: InfoStringProvider[];
}

export class MetadataEditor {
  private options: MetadataEditorOptions;
  private readonly containerSelector: string;
  private readonly entityData: EntityDataInterface;
  private infoStringProviders: InfoStringProvider[];
  private typeData!: PredicateDefinitionsForType;
  private sections: MdeSection[] = [];

  constructor(options: MetadataEditorOptions) {
    const oc = new OptionsChecker({
      optionsDefinition: {
        containerSelector: {type: 'string', required: true},
        entityDataSchema: {type: 'object', required: true},
        entityData: {type: 'object', required: false, default: {}},
        apiClient: {type: 'object', objectClass: ApmApiClient, required: true},
        /**
         * an array of string providers identified by name
         * These can be used to insert any custom string in different places in the editor,
         * for example, in the entity's description in a header section
         */
        infoStringProviders: {
          type: 'array', elementDefinition: {
            type: 'object', objectDefinition: {
              name: {type: 'string', required: true}, /**
               * an async function that takes an entity id and returns a string
               * e.g.  (id) => { ....;  return 'someString'  }
               */
              provider: {type: 'function', required: true}
            }
          }, default: []
        }
      }, context: "MetadataEditor2"
    });
    this.options = oc.getCleanOptions(options);
    this.containerSelector = this.options.containerSelector;
    this.entityData = this.options.entityData;
    this.infoStringProviders = this.options.infoStringProviders ?? [];

    this.getBootstrapHtml().then(async (html) => {
      $(this.options.containerSelector).html(html);
      this.typeData = await this.options.apiClient.getPredicateDefinitionsForType(this.entityData.type);

      this.sections = this.options.entityDataSchema.sections.map((sectionSchema, sectionIndex: number) => {
        switch (sectionSchema.type) {
          case SectionType.Header:
            return new HeaderSection({
              apiClient: this.options.apiClient,
              predicateDefinitions: this.typeData.predicateDefinitions,
              qualificationDefinitions: this.typeData.qualificationDefinitions,
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.entityData,
              sectionSchema: sectionSchema,
              onEntityDataChange: this.genOnEntityDataChange(sectionIndex),
              getInfoString: this.genGetInfoString()
            });

          case SectionType.VerticalList:
            return new PredicateListSection({
              apiClient: this.options.apiClient,
              predicateDefinitions: this.typeData.predicateDefinitions,
              qualificationDefinitions: this.typeData.qualificationDefinitions,
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
              listType: 'vertical',
              onEntityDataChange: this.genOnEntityDataChange(sectionIndex)
            });

          case SectionType.HorizontalList:
            return new PredicateListSection({
              apiClient: this.options.apiClient,
              predicateDefinitions: this.typeData.predicateDefinitions,
              qualificationDefinitions: this.typeData.qualificationDefinitions,
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
              listType: 'horizontal',
              onEntityDataChange: this.genOnEntityDataChange(sectionIndex)
            });

          default:
            return new MdeSection({
              apiClient: this.options.apiClient,
              predicateDefinitions: this.typeData.predicateDefinitions,
              qualificationDefinitions: this.typeData.qualificationDefinitions,
              containerSelector: `${this.containerSelector} .mde-section-${sectionIndex}`,
              entityData: this.options.entityData,
              sectionSchema: sectionSchema,
              onEntityDataChange: this.genOnEntityDataChange(sectionIndex)
            });
        }
      });
      await Promise.all(this.sections.map((section: MdeSection) => {
        return section.init();
      }));
      this.sections.forEach((section: MdeSection) => {
        section.run();
      });

    });
  }

  async getBootstrapHtml(): Promise<string> {
    return this.options.entityDataSchema.sections.map((sectionSchema: any, sectionIndex: number) => {
      return `<div class='mde-section mde-section-${sectionIndex} mde-section_type-${sectionSchema.type}'>
         </div>`;
    }).join('');
  }

  genOnEntityDataChange(sectionIndex: number) {
    return (newData: EntityDataInterface, updatedPredicates: number[]) => {
      return this.onEntityDataChange(newData, updatedPredicates, sectionIndex);
    };
  }

  genGetInfoString() {
    return async (providerName: any) => {
      console.log(`Getting info string for provider ${providerName}`);
      let providers = this.infoStringProviders.filter(provider => provider.name === providerName);
      if (providers.length === 0) {
        console.log(`Provider ${providerName} is undefined`);
        return null;
      }
      return providers[0].provider(this.entityData.id);
    };
  }

  onEntityDataChange(newData: EntityDataInterface, updatedPredicates: number[], originatingSectionIndex: number): Promise<boolean[]> {
    console.log(`New entity data received from section ${originatingSectionIndex}`, updatedPredicates, newData);
    return Promise.all(this.sections.map((section: any, index: number) => {
      if (index !== originatingSectionIndex) {
        return section.updateEntityData(newData, updatedPredicates);
      }
      return true;
    }));

  }

}