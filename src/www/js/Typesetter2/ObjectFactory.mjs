import { TypesetterDocument } from './TypesetterDocument.mjs'
import { TypesetterPage } from './TypesetterPage.mjs'
import { TypesetterItem } from './TypesetterItem.mjs'
import { Box } from './Box.mjs'
import { Glue } from './Glue.mjs'
import { Penalty } from './Penalty.mjs'
import { TextBox } from './TextBox.mjs'
import { ItemList } from './ItemList.mjs'

export class ObjectFactory {

  static fromObject(object) {
    if (object['class'] === undefined) {
      throw  new Error('Attempting to construct from an object without class field')
    }
    switch(object['class']) {
      case 'TypesetterDocument':
        return (new TypesetterDocument()).setFromObject(object, false)

      case 'TypesetterPage':
        return (new TypesetterPage()).setFromObject(object, false)

      case 'TypesetterItem':
        return (new TypesetterItem()).setFromObject(object, false)

      case 'Box':
        return (new Box()).setFromObject(object, false)

      case 'Glue':
        return (new Glue()).setFromObject(object, false)

      case 'Penalty':
        return (new Penalty()).setFromObject(object, false)

      case 'TextBox':
        return (new TextBox()).setFromObject(object, false)

      case 'ItemList':
        return (new ItemList()).setFromObject(object, false)

      default:
        throw new Error(`Unknown object class in exportObject: '${object['class']}'`)
    }
  }
}