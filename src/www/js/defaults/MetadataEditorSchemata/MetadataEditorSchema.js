import * as Entity from '../../constants/Entity'
import * as SchemaContext from './SchemaContext'
import { PersonSchemata } from './PersonSchemata'

export class MetadataEditorSchema {

  /**
   * Returns the metadata editor schema for the given type
   * or null if the schema is not defined
   *
   * @param {number}entityType
   * @param {string}context
   * @return {{}|null}
   */
  static getSchema(entityType, context= SchemaContext.Default) {
    switch (entityType) {
      case Entity.tPerson:
        return PersonSchemata.getSchema(context);
    }

    return null;
  }

}