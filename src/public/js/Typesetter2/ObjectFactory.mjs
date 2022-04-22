import { TypesetterDocument } from './TypesetterDocument.mjs'
import { TypesetterPage } from './TypesetterPage.mjs'
import { TypesetterItem } from './TypesetterItem.mjs'
import { Box } from './Box.mjs'
import { Glue } from './Glue.mjs'
import { Penalty } from './Penalty.mjs'
import { TextBox } from './TextBox.mjs'
import { ItemList } from './ItemList.mjs'

export class ObjectFactory {

  static fromObject(exportObject) {
    if (exportObject['class'] === undefined) {
      throw  new Error('Attempting to construct from an object without class field')
    }
    switch(exportObject['class']) {
      case 'TypesetterDocument':
        return (new TypesetterDocument()).setFromExportObject(exportObject, false)

      case 'TypesetterPage':
        return (new TypesetterPage()).setFromExportObject(exportObject, false)

      case 'TypesetterItem':
        return (new TypesetterItem()).setFromExportObject(exportObject, false)

      case 'Box':
        return (new Box()).setFromExportObject(exportObject, false)

      case 'Glue':
        return (new Glue()).setFromExportObject(exportObject, false)

      case 'Penalty':
        return (new Penalty()).setFromExportObject(exportObject, false)

      case 'TextBox':
        return (new TextBox()).setFromExportObject(exportObject, false)

      case 'ItemList':
        return (new ItemList()).setFromExportObject(exportObject, false)

      default:
        throw new Error(`Unknown object class in exportObject: '${exportObject['class']}'`)
    }
  }
}