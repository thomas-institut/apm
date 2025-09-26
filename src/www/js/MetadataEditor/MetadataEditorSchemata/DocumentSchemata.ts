import * as Entity from '../../constants/Entity'
import * as SectionType from './SectionType'
import * as SchemaContext from './SchemaContext'
import {SchemaInterface} from "./SchemaInterface";

const schemata : { [key: string]: SchemaInterface } = {
  default: {
    type: Entity.tDocument,
    context: SchemaContext.Default,
    sections: [
      {
        type: SectionType.Header,
        predicates: [],
        postDescriptionInfoStrings: [ 'docShortInfo'],
      },
      {
        type: SectionType.VerticalList,
        title: 'General Info',
        predicates: [
          {
            id: Entity.pEntityName,
            label: 'Document Title',
            hideEvenIfActive: true,
            isUniqueInSection: true,
          },
          {
            id: Entity.pEntityDescription,
            label: 'Description',
            hideEvenIfActive: true,
            multiLineInput: true,
            isUniqueInSection: true,
          },
          {
            id: Entity.pDocumentType,
            label: 'Type'
          },
          {
            id: Entity.pDocumentLanguage,
            label: 'Language'
          },
          {
            id: Entity.pAlternateName,
            label: 'Alt. Name(s)'
          },
        ]
      },
      {
        type: SectionType.VerticalList,
        title: 'Images',
        predicates: [
          {
            id: Entity.pImageSource,
            isUniqueInSection: true,
          },
          {
            id: Entity.pImageSourceData,
            label: 'Image Source Data',
            isUniqueInSection: true,
            hideEvenIfActive: true,
          },
        ]
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



export class DocumentSchemata {

  static getSchema(context= 'default') {
    return schemata[context] ?? null;
  }
}

