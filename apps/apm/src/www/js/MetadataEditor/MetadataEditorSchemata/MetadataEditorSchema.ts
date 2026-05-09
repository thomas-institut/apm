import * as Entity from '../../constants/Entity'
import * as SchemaContext from './SchemaContext'
import { PersonSchemata } from './PersonSchemata'
import { DocumentSchemata } from './DocumentSchemata'
import {SchemaInterface} from "./SchemaInterface";

export class MetadataEditorSchema {

  /**
   * Returns the metadata editor schema for the given type
   * or null if the schema is not defined
   *
   */
  static getSchema(entityType: number, context= SchemaContext.Default): SchemaInterface | null {
    switch (entityType) {
      case Entity.tPerson:
        return PersonSchemata.getSchema(context);

      case Entity.tDocument:
        return DocumentSchemata.getSchema(context);
    }

    return null;
  }

}