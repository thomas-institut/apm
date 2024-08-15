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
        title: 'General Data',
        predicates: [
          {
            id: Entity.pSortName,
            displayIfNotSet: true,
            isUniqueInSection: true,
          },
          {
            id: Entity.pDateOfBirth,
            displayIfNotSet: true,
            isUniqueInSection: true,
          },
          {
            id: Entity.pDateOfDeath,
            displayIfNotSet: false,
            isUniqueInSection: true,
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
            showUrl: true
          }
        })
      },
      {
        type: SectionType.UrlList,
        predicates: []
      }
    ]
  }
}



export class PersonSchemata {

  static getSchema(context= 'default') {
    return schemata[context] ?? null;
  }
}

