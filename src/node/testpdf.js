
import GI from 'node-gtk/lib/index.js'
const Cairo = GI.require('cairo', '1.0')
const Pango  = GI.require('Pango', '1.0')
const PangoCairo = GI.require('PangoCairo')


const a5WidthInPt = 14.1 * 72 / 2.54
const a5HeightInPt = 21 * 72 / 2.54

const fileName = 'test01.pdf'

GI.startLoop()
console.log(`Trying to save a PDF`)

// const paths = GI._GIRepository.Repository_get_search_path()


GI.listAvailableModules().then( (data) => {
  data.forEach((d) => {
    console.log(d)
  })
})

// let surface = Cairo.PDFSurface(fileName, a5WidthInPt, a5HeightInPt)
// let context = Cairo.Context(surface)
// let layout = PangoCairo.createLayout(context)
// let fd = Pango.fontDescriptionFromString('FreeSerif 12')
// layout.setFontDescription(fd)
// layout.setText("Test 01")
//
// context.moveTo(20, 20)
// context.setSourceRgb(0,0,0)
// PangoCairo.showLayout(context, layout)
// context.showPage()

