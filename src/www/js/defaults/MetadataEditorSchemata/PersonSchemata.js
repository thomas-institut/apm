import * as Entity from '../../constants/Entity'
import * as SectionType from './SectionType'
import * as SchemaContext from './SchemaContext'

const schemata = {
  default: {
    type: Entity.tPerson,
    context: SchemaContext.Default,
    sections: [
      {
        type: SectionType.EditableHeader,
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
            id: Entity.pDateOfDeath,
            isUniqueInSection: true,
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
        predicates: [Entity.pWikiDataId, Entity.pOrcid, Entity.pViafId, Entity.pGNDId, Entity.pLocId].map( (idType) => {
          return {
            id: idType,
            showLogo: true,
            showUrl: true,
          }
        })
      },
      {
        type: SectionType.VerticalList,
        title: 'Urls',
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

  static getSchema(context= 'default') {
    return schemata[context] ?? null;
  }
}

