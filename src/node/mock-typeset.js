

import {removeExtraWhiteSpace} from '../public/js/toolbox/Util.mjs'
import {SimpleTypesetter} from '../public/js/Typesetter2/SimpleTypesetter.mjs'
import { PangoMeasurer } from './PangoMeasurer.mjs'
import { TextBoxFactory} from '../public/js/Typesetter2/TextBoxFactory.mjs'
import { ItemList } from '../public/js/Typesetter2/ItemList.mjs'
import * as TypesetterItemDirection from '../public/js/Typesetter2/TypesetterItemDirection.mjs'
import {Glue} from '../public/js/Typesetter2/Glue.mjs'


let typesetter = new SimpleTypesetter(
  {
    pageWidth: 500,
    pageHeight: 500,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    lineSkip: 20,
    textBoxMeasurer: new PangoMeasurer()
  })

const stringToTypeset = 'This is a test and another test and a word'


let wordTextBoxes = removeExtraWhiteSpace(stringToTypeset).split(' ').map ( (word) => {
  return TextBoxFactory.simpleText(word, { fontFamily: 'FreeSerif', fontSize: 12})
})
let paragraphToTypeset = new ItemList(TypesetterItemDirection.HORIZONTAL)
wordTextBoxes.forEach( (textBox, i) => {
  paragraphToTypeset.pushItem(textBox)
  let glueToken = (new Glue()).setWidth(6)
    .setStretch(1)
    .setShrink(1)
  if (i !== wordTextBoxes.length - 1) {
    paragraphToTypeset.pushItem(glueToken)
  }
})

let verticalListToTypeset = new ItemList(TypesetterItemDirection.VERTICAL)
verticalListToTypeset.pushItem(paragraphToTypeset)

typesetter.typeset(verticalListToTypeset).then( (r) => {
  console.log(`Mock typeset done`)
  console.log(r[0].lists[0].list[0].list)
})


