import { ObjectFactory } from '../www/js/lib/Typesetter2/ObjectFactory.js'
import { PangoMeasurerNodeGTK } from './PangoMeasurerNodeGTK.js'
import { SystemStyleSheet } from '../www/js/defaults/EditionStyles/SystemStyleSheet.js'
import { BasicTypesetter } from '../www/js/lib/Typesetter2/BasicTypesetter.js'
import { hrtime } from 'node:process'
import { EditionTypesetting } from '../www/js/Edition/EditionTypesetting.js'
import {ItemList} from "../www/js/lib/Typesetter2/ItemList.js";

/**
 * Processes an input data object containing a main text
 * list and possibly some typesetting options.
 *
 * @param {any}inputData
 * @return{ Promise<{ error: boolean, errorMsg: string, output: {}, info: {} }>}
 */

const debug = false;

export interface OutputData {
  error: boolean;
  errorMsg: string;
  output?: any;
  stats?: Stats;
}

export interface Stats {
  measurer?: string;
  measurerStats?: any;
  processingTime?: number;
}
export async function processInputJson(data:any): Promise<OutputData> {
  let outputData: OutputData = {
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

  let mainTextList : ItemList;

  try {
    mainTextList = ObjectFactory.fromObject(data.mainTextList) as unknown as ItemList;
  } catch (e: any) {
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
    data.options.getApparatusListToTypeset = (mainTextVerticalList:any, apparatus:any, lineFrom:number, lineTo:number, resetFirstLine: boolean) => {
      return editionTypesettingHelper.generateApparatusVerticalListToTypeset(mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine)
    }
    data.options.preTypesetApparatuses = () => {
      editionTypesettingHelper.resetExtractedMetadataInfo();
      return Promise.resolve(true);
    }

    data.options.getMarginaliaForLineRange =  (lineFrom: number, lineTo: number) =>{
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

function getStats(data:any) {
  return {
    measurer: 'PangoGtk',
    measurerStats: data.options.textBoxMeasurer.getStats(),
    processingTime: 0,
  }
}