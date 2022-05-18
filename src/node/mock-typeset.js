

import {removeExtraWhiteSpace} from '../www/js/toolbox/Util.mjs'
import {BasicTypesetter} from '../www/js/Typesetter2/BasicTypesetter.mjs'
import { PangoMeasurer } from './PangoMeasurer.mjs'
import { TextBoxFactory} from '../www/js/Typesetter2/TextBoxFactory.mjs'
import { ItemList } from '../www/js/Typesetter2/ItemList.mjs'
import * as TypesetterItemDirection from '../www/js/Typesetter2/TypesetterItemDirection.mjs'
import {Glue} from '../www/js/Typesetter2/Glue.mjs'
import { hrtime } from 'node:process';
import { PangoMeasurerSocket } from './PangoMeasurerSocket.mjs'
import { PangoMeasurerNodeGTK } from './PangoMeasurerNodeGTK.mjs'







const stringToTypeset = `This is a test and another test and a word. En un lugar de la Mancha de cuyo nombre no 
quiero acordarme, no ha mucho que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco
y galgo corredor. Let's write even more text, just to see what happens here.  Breakfast procuring nay end happiness 
allowance assurance frankness. Met simplicity nor difficulty unreserved who. Entreaties mr conviction dissimilar me 
astonished estimating cultivated. On no applauded exquisite my additions. Pronounce add boy estimable nay suspected. 
You sudden nay elinor thirty esteem temper. Quiet leave shy you gay off asked large style.
Left till here away at to whom past. Feelings laughing at no wondered repeated provided finished. It acceptance 
thoroughly my advantages everything as. Are projecting inquietude affronting preference saw who. Marry of am do avoid 
ample as. Old disposal followed she ignorant desirous two has. Called played entire roused though for one too. 
He into walk roof made tall cold he. Feelings way likewise addition wandered contempt bed indulged.
Mind what no by kept. Celebrated no he decisively thoroughly. Our asked sex point her she seems. 
New plenty she horses parish design you. Stuff sight equal of my woody. Him children bringing goodness 
suitable she entirely put far daughter. 
quiero acordarme, no ha mucho que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco
y galgo corredor. Let's write even more text, just to see what happens here.  Breakfast procuring nay end happiness 
allowance assurance frankness. Met simplicity nor difficulty unreserved who. Entreaties mr conviction dissimilar me 
astonished estimating cultivated. On no applauded exquisite my additions. Pronounce add boy estimable nay suspected. 
You sudden nay elinor thirty esteem temper. Quiet leave shy you gay off asked large style.
Left till here away at to whom past. Feelings laughing at no wondered repeated provided finished. It acceptance 
thoroughly my advantages everything as. Are projecting inquietude affronting preference saw who. Marry of am do avoid 
ample as. Old disposal followed she ignorant desirous two has. Called played entire roused though for one too. 
He into walk roof made tall cold he. Feelings way likewise addition wandered contempt bed indulged.
Mind what no by kept. Celebrated no he decisively thoroughly. Our asked sex point her she seems. 
New plenty she horses parish design you. Stuff sight equal of my woody. Him children bringing goodness 
suitable she entirely put far daughter.
quiero acordarme, no ha mucho que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco
y galgo corredor. Let's write even more text, just to see what happens here.  Breakfast procuring nay end happiness 
allowance assurance frankness. Met simplicity nor difficulty unreserved who. Entreaties mr conviction dissimilar me 
astonished estimating cultivated. On no applauded exquisite my additions. Pronounce add boy estimable nay suspected. 
You sudden nay elinor thirty esteem temper. Quiet leave shy you gay off asked large style.
Left till here away at to whom past. Feelings laughing at no wondered repeated provided finished. It acceptance 
thoroughly my advantages everything as. Are projecting inquietude affronting preference saw who. Marry of am do avoid 
ample as. Old disposal followed she ignorant desirous two has. Called played entire roused though for one too. 
He into walk roof made tall cold he. Feelings way likewise addition wandered contempt bed indulged.
Mind what no by kept. Celebrated no he decisively thoroughly. Our asked sex point her she seems. 
New plenty she horses parish design you. Stuff sight equal of my woody. Him children bringing goodness 
suitable she entirely put far daughter.
quiero acordarme, no ha mucho que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco
y galgo corredor. Let's write even more text, just to see what happens here.  Breakfast procuring nay end happiness 
allowance assurance frankness. Met simplicity nor difficulty unreserved who. Entreaties mr conviction dissimilar me 
astonished estimating cultivated. On no applauded exquisite my additions. Pronounce add boy estimable nay suspected. 
You sudden nay elinor thirty esteem temper. Quiet leave shy you gay off asked large style.
Left till here away at to whom past. Feelings laughing at no wondered repeated provided finished. It acceptance 
thoroughly my advantages everything as. Are projecting inquietude affronting preference saw who. Marry of am do avoid 
ample as. Old disposal followed she ignorant desirous two has. Called played entire roused though for one too. 
He into walk roof made tall cold he. Feelings way likewise addition wandered contempt bed indulged.
Mind what no by kept. Celebrated no he decisively thoroughly. Our asked sex point her she seems. 
New plenty she horses parish design you. Stuff sight equal of my woody. Him children bringing goodness 
suitable she entirely put far daughter. 
quiero acordarme, no ha mucho que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco
y galgo corredor. Let's write even more text, just to see what happens here.  Breakfast procuring nay end happiness 
allowance assurance frankness. Met simplicity nor difficulty unreserved who. Entreaties mr conviction dissimilar me 
astonished estimating cultivated. On no applauded exquisite my additions. Pronounce add boy estimable nay suspected. 
You sudden nay elinor thirty esteem temper. Quiet leave shy you gay off asked large style.
Left till here away at to whom past. Feelings laughing at no wondered repeated provided finished. It acceptance 
thoroughly my advantages everything as. Are projecting inquietude affronting preference saw who. Marry of am do avoid 
ample as. Old disposal followed she ignorant desirous two has. Called played entire roused though for one too. 
He into walk roof made tall cold he. Feelings way likewise addition wandered contempt bed indulged.
Mind what no by kept. Celebrated no he decisively thoroughly. Our asked sex point her she seems. 
New plenty she horses parish design you. Stuff sight equal of my woody. Him children bringing goodness 
suitable she entirely put far daughter.
quiero acordarme, no ha mucho que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco
y galgo corredor. Let's write even more text, just to see what happens here.  Breakfast procuring nay end happiness 
allowance assurance frankness. Met simplicity nor difficulty unreserved who. Entreaties mr conviction dissimilar me 
astonished estimating cultivated. On no applauded exquisite my additions. Pronounce add boy estimable nay suspected. 
You sudden nay elinor thirty esteem temper. Quiet leave shy you gay off asked large style.
Left till here away at to whom past. Feelings laughing at no wondered repeated provided finished. It acceptance 
thoroughly my advantages everything as. Are projecting inquietude affronting preference saw who. Marry of am do avoid 
ample as. Old disposal followed she ignorant desirous two has. Called played entire roused though for one too. 
He into walk roof made tall cold he. Feelings way likewise addition wandered contempt bed indulged.
Mind what no by kept. Celebrated no he decisively thoroughly. Our asked sex point her she seems. 
New plenty she horses parish design you. Stuff sight equal of my woody. Him children bringing goodness 
suitable she entirely put far daughter.
`


function getVerticalListToTypeset() {
  let wordTextBoxes = removeExtraWhiteSpace(stringToTypeset).split(' ').map ( (word) => {
    return TextBoxFactory.simpleText(word, { fontFamily: 'FreeSerif', fontSize: 12})
  })
  console.log(`Typesetting ${wordTextBoxes.length} words`)
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
  return verticalListToTypeset
}




// let execMeasurer = new PangoMeasurer()
// let typesetterExec = new SimpleTypesetter(
//   {
//     pageWidth: 500,
//     pageHeight: 500,
//     marginTop: 10,
//     marginBottom: 10,
//     marginLeft: 10,
//     marginRight: 10,
//     lineSkip: 20,
//     textBoxMeasurer: execMeasurer,
//     debug: false
//   })
//
//
// let start = hrtime.bigint()
// typesetterExec.typeset(getVerticalListToTypeset()).then( (r) => {
//   let end = hrtime.bigint()
//   //console.log(r[0].lists[0].list[0].list)
//   console.log(`Exec typeset done in ${Number(end-start)/1000000} ms`)
//   console.log(execMeasurer.getStats())
// })



let nodeGtkMeasurer = new PangoMeasurerNodeGTK()
let typesetterExec = new BasicTypesetter(
  {
    pageWidth: 500,
    pageHeight: 500,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    lineSkip: 20,
    textBoxMeasurer: nodeGtkMeasurer,
    debug: false
  })


let start = hrtime.bigint()
typesetterExec.typeset(getVerticalListToTypeset()).then( (r) => {
  let end = hrtime.bigint()
  //console.log(r[0].lists[0].list[0].list)
  console.log(`NodeGtk typeset done in ${Number(end-start)/1000000} ms`)
  console.log(nodeGtkMeasurer.getStats())
})


let pangoMeasurerSocket = new PangoMeasurerSocket()

pangoMeasurerSocket.init().then( () => {
  let typesetterSocket = new BasicTypesetter(
    {
      pageWidth: 500,
      pageHeight: 500,
      marginTop: 10,
      marginBottom: 10,
      marginLeft: 10,
      marginRight: 10,
      lineSkip: 20,
      textBoxMeasurer: pangoMeasurerSocket
    })

  let start2 = hrtime.bigint()
  typesetterSocket.typeset(getVerticalListToTypeset()).then( (r) => {
    let end = hrtime.bigint()
    //console.log(r[0].lists[0].list[0].list)
    console.log(`Socket typeset done in ${Number(end-start2)/1000000} ms`)
    console.log(pangoMeasurerSocket.getStats())
    pangoMeasurerSocket.destroy()
  })
}).catch( (reason) => {
  console.log(`Could not init socket measurer: ${reason}`)
})





