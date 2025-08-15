import {TypesetterDocument} from './TypesetterDocument.js';
import {TypesetterPage} from './TypesetterPage.js';
import {TypesetterItem} from './TypesetterItem.js';
import {Box} from './Box.js';
import {Glue} from './Glue.js';
import {Penalty} from './Penalty.js';
import {TextBox} from './TextBox.js';
import {ItemList} from './ItemList.js';

export class ObjectFactory {

  static fromObject(object: any) {
    if (object['class'] === undefined) {
      throw new Error('Attempting to construct from an object without class field');
    }
    switch (object['class']) {
      case 'TypesetterDocument':
        return (new TypesetterDocument()).setFromObject(object, false);

      case 'TypesetterPage':
        return (new TypesetterPage()).setFromObject(object, false);

      case 'TypesetterItem':
        return (new TypesetterItem()).setFromObject(object, false);

      case 'Box':
        return (new Box()).setFromObject(object, false);

      case 'Glue':
        return (new Glue()).setFromObject(object, false);

      case 'Penalty':
        return (new Penalty()).setFromObject(object, false);

      case 'TextBox':
        return (new TextBox()).setFromObject(object, false);

      case 'ItemList':
        return (new ItemList()).setFromObject(object, false);

      default:
        throw new Error(`Unknown object class in exportObject: '${object['class']}'`);
    }
  }
}