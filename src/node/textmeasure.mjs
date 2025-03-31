import {PangoMeasurerNodeGTK} from './PangoMeasurerNodeGTK.mjs'
import process from 'node:process'
import GI from 'node-gtk'
const Pango  = GI.require('Pango')

const usage = `Usage: node textmeasure.mjs font size text`

if (process.argv.length < 4) {
  console.log(usage)
  process.exit(0)
}

let font = process.argv[2]
let size = parseInt(process.argv[3])

if (size <= 0) {
  console.log(`Wrong font size`)
  console.log(usage)
  process.exit(0)
}

let text = process.argv[4]

let measurer =  new PangoMeasurerNodeGTK()


const scale= 1000

let measurements = measurer.measureText(text, `${font} ${scale*size}`)
console.log(`Measurements for '${text}', font '${font}', size ${size}`)

console.log(`Logical: ${measurements.logical.width / (Pango.SCALE*scale)} with shift = ${measurements.logical.x / (Pango.SCALE*scale)}`)


