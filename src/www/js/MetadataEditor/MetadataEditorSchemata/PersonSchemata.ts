import * as Entity from '../../constants/Entity'
import * as SectionType from './SectionType'
import * as SchemaContext from './SchemaContext'
import {PredicateDefinitionForSection, SchemaInterface} from "./SchemaInterface";

const schemata : { [key: string]: SchemaInterface } = {
  default: {
    type: Entity.tPerson,
    context: SchemaContext.Default,
    sections: [
      {
        type: SectionType.Header,
        predicates: [],
      },
      {
        type: SectionType.VerticalList,
        title: 'Basic Data',
        predicates: [
          {
            id: Entity.pEntityName,
            hideEvenIfActive: true,
            isUniqueInSection: true,
          },
          {
            id: Entity.pEntityDescription,
            hideEvenIfActive: true,
            multiLineInput: true,
            isUniqueInSection: true,
          },
          {
            id: Entity.pSortName,
            isUniqueInSection: true,
          },
          {
            id: Entity.pDateOfBirth,
            isUniqueInSection: true,
          },
          {
            id: Entity.pPlaceOfBirth,
          },
          {
            id: Entity.pDateOfDeath,
            isUniqueInSection: true,
          },
          {
            id: Entity.pPlaceOfDeath
          },
          {
            id: Entity.pAlternateName,
            label: 'Alt. Name'
          },

        ]
      },
      {
        type: SectionType.HorizontalList,
        title: 'External Ids',
        predicates: [Entity.pWikiDataId, Entity.pOrcid, Entity.pViafId, Entity.pGNDId, Entity.pLocId].map( (idType): PredicateDefinitionForSection => {
          return {
            id: idType,
            showLogo: true,
            showUrl: true,
          }
        })
      },
      {
        type: SectionType.VerticalList,
        title: 'External Links',
        predicates: [
          {
            id: Entity.pUrl,
            label: null,
            alwaysShow: true,
            showUrl: true
          }
        ]
      }
    ]
  }
}



export class PersonSchemata {

  static getSchema(context= 'default'): SchemaInterface | null   {
    return schemata[context] ?? null;
  }
}

