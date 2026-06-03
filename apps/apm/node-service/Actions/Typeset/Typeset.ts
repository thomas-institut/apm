import {BasicTypesetter, BasicTypesetterOptions, ItemList, ObjectFactory} from '@thomas-inst/typesetter';
import {PangoMeasurerNodeGTK} from '../../PangoMeasurerNodeGTK.js';

// @ts-ignore
import {SystemStyleSheet} from '../../../www/js/defaults/EditionStyles/SystemStyleSheet.js';
// @ts-ignore
import {EditionTypesettingHelper, EditionTypesettingHelperOptions} from '../../../www/js/Edition/EditionTypesettingHelper.js';
import {Edition} from "../../../www/js/Edition/Edition.js";
import {ApparatusInterface} from "../../../www/js/Edition/EditionInterface.js";
import {LoggerInterface} from "../../SimpleLogger/LoggerInterface.js";

const debug = false;

export type ExportedTypesetDocument = Record<string, any>;

export interface TypesetOutputData {
  id: string;
  error: boolean;
  errorMsg: string;
  output?: ExportedTypesetDocument;
  stats: Stats;
}

export interface Stats {
  measurer?: string;
  measurerStats?: any;
}

interface TypesetInputData {
  id?: string;
  mainTextList: any;
  options: BasicTypesetterOptions<ApparatusInterface>;
  helperOptions?: EditionTypesettingHelperOptions;
  extraData?: any;
}


export class Typeset implements Action<TypesetInputData, TypesetOutputData> {
  private logger: LoggerInterface;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
  }


  async execute(data: TypesetInputData): Promise<TypesetOutputData> {
    let inputId = data.id ?? this.getRandomId();

    let outputData: TypesetOutputData = {
      id: inputId,
      error: false, errorMsg: '', output: {}, stats: {}
    };


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

    if (data.helperOptions === undefined) {
      outputData.errorMsg = `No helper options found in input`;
      outputData.error = true;
      return outputData;
    }

    let mainTextList: ItemList;

    try {
      mainTextList = ObjectFactory.fromObject(data.mainTextList) as unknown as ItemList;
    } catch (e: any) {
      outputData.errorMsg = `Error building typesetter object from input main text list: '${e.toString()}'`;
      outputData.error = true;
      return outputData;
    }

    if (data.helperOptions.styleId === undefined) {
      outputData.errorMsg = `No styleId found in input`;
      outputData.error = true;
      return outputData;
    }

    const textMeasurer = new PangoMeasurerNodeGTK();

    data.options.textBoxMeasurer = textMeasurer;
    if (data.options.lineNumbersOptions !== undefined) {
      data.options.lineNumbersOptions.textBoxMeasurer = textMeasurer;
    }
    if (data.options.pageNumbersOptions !== undefined) {
      data.options.pageNumbersOptions.textBoxMeasurer = textMeasurer;
    }
    if (data.options.marginaliaOptions !== undefined) {
      data.options.marginaliaOptions.textBoxMeasurer = textMeasurer;
    }


    if (data.helperOptions !== undefined) {
      debug && this.logger.debug(`Helper options given, so this is an edition!`);

      data.helperOptions.textBoxMeasurer = data.options.textBoxMeasurer;
      debug &&this.logger.debug(`Edition lang: '${data.helperOptions.edition.lang}', style Id = ${data.helperOptions.styleId}`);
      // make the data an Edition object
      data.helperOptions.edition = new Edition().setFromInterface(data.helperOptions.edition);
      data.helperOptions.editionStyleSheet = SystemStyleSheet.getStyleSheet(data.helperOptions.edition.lang, data.helperOptions.styleId);
      let editionTypesettingHelper = new EditionTypesettingHelper(data.helperOptions);
      data.options.getApparatusListToTypeset = (mainTextVerticalList: any, apparatus: any, lineFrom: number, lineTo: number, resetFirstLine: boolean) => {
        return editionTypesettingHelper.generateApparatusVerticalListToTypeset(mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine);
      };
      data.options.preTypesetApparatuses = () => {
        editionTypesettingHelper.resetExtractedMetadataInfo();
        return Promise.resolve(true);
      };

      data.options.getMarginaliaForLineRange = (lineFrom: number, lineTo: number) => {
        return editionTypesettingHelper.getMarginaliaForLineRange(lineFrom, lineTo);
      };
    }

    let typesetter = new BasicTypesetter(data.options);
    let typesetDoc = await typesetter.typeset(mainTextList, data.extraData);
    outputData.output = typesetDoc.getExportObject();
    outputData.stats = this.getStats(data);
    return outputData;
  }

  private getStats(data: any) {
    return {
      measurer: 'PangoGtk', measurerStats: data.options.textBoxMeasurer.getStats()
    };
  }

  private getRandomId(): string {
    return Math.round(100000000000 * Math.random()).toString(30);
  }

}