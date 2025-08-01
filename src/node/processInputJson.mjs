// noinspection ES6PreferShortImport

import { ObjectFactory } from '../www/js/Typesetter2/ObjectFactory.mjs'
import { PangoMeasurerNodeGTK } from './PangoMeasurerNodeGTK.mjs'
import { SystemStyleSheet } from '../www/js/Typesetter2/Style/SystemStyleSheet.mjs'
import { BasicTypesetter } from '../www/js/Typesetter2/BasicTypesetter.mjs'
import { hrtime } from 'node:process'
import { EditionTypesetting } from '../www/js/Edition/EditionTypesetting.mjs'

/**
 * Processes an input data object containing a main text
 * list and possibly some typesetting options.
 *
 * @param {any}inputData
 * @return{ Promise<{ error: boolean, errorMsg: string, output: {}, info: {} }>}
 */

const debug = false;
export async function processInputJson(data) {
  let outputData = {
    error: false,
    errorMsg: '',
    output: {},
    stats: {}
  }


  if (data.options === undefined) {
    outputData.error = true;
    outputData.errorMsg = `No options found in input`;
    return outputData;
  }


  if (data.mainTextList === undefined) {
    outputData.errorMsg = `No main text list found in input`;
    outputData.error = true;
    return outputData;
  }

  let mainTextList;

  try {
    mainTextList = ObjectFactory.fromObject(data.mainTextList)
  } catch (e) {
    outputData.errorMsg = `Error building typesetter object from input main text list: '${e.toString()}'`;
    outputData.error = true;
    return outputData;
  }


  data.options.textBoxMeasurer = new PangoMeasurerNodeGTK()

  if (data.helperOptions !== undefined) {
    debug && console.log(`Helper options given, so this is an edition!`)

    data.helperOptions.textBoxMeasurer = data.options.textBoxMeasurer
    debug && console.log(`Edition lang: '${data.helperOptions.edition.lang}', style Id = ${data.helperOptions.styleId}`)
    data.helperOptions.editionStyleSheet = SystemStyleSheet.getStyleSheet(data.helperOptions.edition.lang, data.helperOptions.styleId);
    let editionTypesettingHelper = new EditionTypesetting(data.helperOptions)
    data.options.getApparatusListToTypeset = (mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine) => {
      return editionTypesettingHelper.generateApparatusVerticalListToTypeset(mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine)
    }
    data.options.preTypesetApparatuses = () => {
      editionTypesettingHelper.resetExtractedMetadataInfo();
      return new Promise( (resolve) => { resolve(true)});
    }

    data.options.getMarginaliaForLineRange =  (lineFrom, lineTo) =>{
      return editionTypesettingHelper.getMarginaliaForLineRange(lineFrom, lineTo)
    }
  }

  let typesetter = new BasicTypesetter(data.options)

  let start = hrtime.bigint();
  let typesetDoc = await typesetter.typeset(mainTextList, data.extraData);
  outputData.output = typesetDoc.getExportObject();


  let end = hrtime.bigint();
  outputData.stats = getStats(data)
  outputData.stats.processingTime = Number(end-start)/1000000;
  return outputData;
}

function getStats(data) {
  return {
    measurer: 'PangoGtk',
    measurerStats: data.options.textBoxMeasurer.getStats()
  }
}