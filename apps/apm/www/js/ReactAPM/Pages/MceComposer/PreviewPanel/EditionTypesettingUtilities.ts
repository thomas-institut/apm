import {Edition} from "@/Edition/Edition";
import {
  BasicTypesetter,
  BasicTypesetterOptions,
  Dimension,
  ItemList,
  MarginaliaAlignDirection, StyleSheet,
  Typesetter,
  TypesetterDocument
} from "@thomas-inst/typesetter";
import {EditionTypesettingHelper, EditionTypesettingHelperOptions} from "@/Edition/EditionTypesettingHelper";
import {CanvasTextBoxMeasurer} from "@/lib/CanvasTextBoxMeasurer";
import {isRtl} from "@/toolbox/Util";
import {ApparatusInterface} from "@/Edition/EditionInterface";
import {BasicProfiler} from "@/toolbox/BasicProfiler";
import {ApiTypesetPdfRequestData} from "@/Api/DataSchema/ApiPdfUrl";

interface TypesettingParameters {
  options: BasicTypesetterOptions<ApparatusInterface>,
  helper: EditionTypesettingHelper,
  helperOptions: EditionTypesettingHelperOptions,
  mainTextList: ItemList,
  extraData: { apparatuses: ApparatusInterface[] }
}

export async function getTypesettingParameters(edition: Edition, styleSheet: StyleSheet, styleId: string): Promise<TypesettingParameters> {
  let strings = styleSheet.getStrings();
  let defaultStyleDef = styleSheet.getStyleDef('default');
  let apparatusStyleDef = styleSheet.getStyleDef('apparatus');
  let defaultFontSize = Dimension.str2px(defaultStyleDef.text?.fontSize ?? 0);
  if (defaultFontSize === 0) {
    console.warn(`Default font size is not well defined in stylesheet: '${defaultStyleDef.text?.fontSize}'`);
    defaultFontSize = 16;
  }
  let apparatusFontSize = Dimension.str2px(apparatusStyleDef.text?.fontSize ?? 0, defaultFontSize);
  if (apparatusFontSize === 0) {
    console.warn(`Apparatus font size is not well defined in stylesheet: '${styleSheet.getStyleDef('apparatus').text?.fontSize}'`);
    apparatusFontSize = 14;
  }
  const helperOptions: EditionTypesettingHelperOptions = {
    edition: edition,
    editionStyleSheet: styleSheet,
    textBoxMeasurer: new CanvasTextBoxMeasurer(),
    styleId: styleId,
    debug: false
  };

  const pageStyle = styleSheet.getStyleDef('default').page;
  const defaultLineNumbersPosition = isRtl(edition.lang) ? 'right' : 'left';
  const styleLineNumberPosition = pageStyle !== undefined ? (pageStyle.lineNumbersPosition ?? defaultLineNumbersPosition) : defaultLineNumbersPosition;
  console.log(`styleLineNumberPosition`, styleLineNumberPosition);
  let lineNumbersAlign = 'right';

  const params = {
    fontFamily: defaultStyleDef.text?.fontFamily ?? 'serif',
    entrySeparator: strings['entrySeparator'],
    apparatusLineSeparator: strings['lineRangeSeparator'],
    pageWidthInCm: Dimension.str2cm(defaultStyleDef.page?.width ?? '20cm', defaultFontSize),
    pageHeightInCm: Dimension.str2cm(defaultStyleDef.page?.height ?? '30cm', defaultFontSize),
    marginInCm: {
      top: Dimension.str2cm(defaultStyleDef.page?.marginTop ?? '2cm', defaultFontSize),
      left: Dimension.str2cm(defaultStyleDef.page?.marginLeft ?? '2cm', defaultFontSize),
      bottom: Dimension.str2cm(defaultStyleDef.page?.marginBottom ?? '2cm', defaultFontSize),
      right: Dimension.str2cm(defaultStyleDef.page?.marginRight ?? '2cm', defaultFontSize),
    },
    mainTextFontSizeInPts: Dimension.px2pt(defaultFontSize),
    lineNumbersFontSizeInPts: Dimension.str2pt(defaultStyleDef.page?.lineNumbersFontSize ?? '0.8em', defaultFontSize),
    resetLineNumbersEachPage: defaultStyleDef.page?.resetLineNumbersEachPage ?? false,
    apparatusFontSizeInPts: Dimension.px2pt(apparatusFontSize),
    mainTextLineHeightInPts: Dimension.str2pt(defaultStyleDef.paragraph?.lineSkip ?? '24pt', defaultFontSize),
    apparatusLineHeightInPts: Dimension.str2pt(apparatusStyleDef.paragraph?.lineSkip ?? '20pt', apparatusFontSize),
    normalSpaceWidthInEms: 0.25,  // TODO: Check usages and change to glue
    textToLineNumbersInCm: Dimension.str2cm(defaultStyleDef.page?.lineNumbersToTextDistance ?? '1cm', defaultFontSize),
    textToApparatusInCm: Dimension.str2cm(defaultStyleDef.page?.minDistanceFromApparatusToText ?? '1cm', defaultFontSize),
    interApparatusInCm: Dimension.str2cm(defaultStyleDef.page?.minInterApparatusDistance ?? '1cm', defaultFontSize),
    textToMarginaliaInCm: Dimension.str2cm('0.3cm'), // TODO: add to stylesheet
    debug: true
  };

  const geometry = {
    pageWidth: Typesetter.cm2px(params.pageWidthInCm),
    pageHeight: Typesetter.cm2px(params.pageHeightInCm),
    lineWidth: Typesetter.cm2px(params.pageWidthInCm - params.marginInCm.left - params.marginInCm.right),
    mainTextLineHeight: Typesetter.pt2px(params.mainTextLineHeightInPts),
    mainTextFontSize: Typesetter.pt2px(params.mainTextFontSizeInPts),
    apparatusLineHeight: Typesetter.pt2px(params.apparatusLineHeightInPts),
    apparatusFontSize: Typesetter.pt2px(params.apparatusFontSizeInPts),
    margin: {
      top: Typesetter.cm2px(params.marginInCm.top),
      left: Typesetter.cm2px(params.marginInCm.left),
      bottom: Typesetter.cm2px(params.marginInCm.bottom),
      right: Typesetter.cm2px(params.marginInCm.right)
    },
    textToLineNumbers: Typesetter.cm2px(params.textToLineNumbersInCm),
    textToMarginalia: Typesetter.cm2px(params.textToMarginaliaInCm),
    textToApparatus: Typesetter.cm2px(params.textToApparatusInCm),
    interApparatus: Typesetter.cm2px(params.interApparatusInCm),
    normalSpaceWidthInEms: params.normalSpaceWidthInEms
  };


  let lineNumbersX = geometry.margin.left - geometry.textToLineNumbers;
  let marginaliaX = geometry.pageWidth - geometry.margin.right + geometry.textToMarginalia;
  let marginaliaAlign: MarginaliaAlignDirection = 'left';
  if (styleLineNumberPosition === 'right') {
    lineNumbersAlign = 'left';
    lineNumbersX = geometry.pageWidth - geometry.margin.right + geometry.textToLineNumbers;
    marginaliaAlign = 'right';
    marginaliaX = geometry.margin.left - geometry.textToMarginalia;
  }
  const fontFamily = defaultStyleDef.text?.fontFamily ?? 'serif';

  const helper = new EditionTypesettingHelper(helperOptions);

  const typesetterOptions: BasicTypesetterOptions<ApparatusInterface> = {
    pageWidth: geometry.pageWidth,
    pageHeight: geometry.pageHeight,
    marginTop: geometry.margin.top,
    marginBottom: geometry.margin.bottom,
    marginLeft: geometry.margin.left,
    marginRight: geometry.margin.right,
    defaultFontFamily: fontFamily,
    defaultFontSize: geometry.mainTextFontSize,
    lineSkip: geometry.mainTextLineHeight,
    apparatusLineSkip: Dimension.pt2px(params.apparatusLineHeightInPts),
    textToApparatusGlue: {
      height: geometry.textToApparatus,
      shrink: geometry.textToApparatus * 0.1,
      stretch: geometry.pageHeight - geometry.margin.bottom - geometry.margin.top
    },
    interApparatusGlue: {
      height: geometry.interApparatus, shrink: 0, stretch: 0
    },
    showPageNumbers: true,
    pageNumbersOptions: {
      fontFamily: fontFamily,
      fontSize: geometry.mainTextFontSize,
      numeralSystem: edition.lang === 'ar' ? 'EasternArabic' : 'WesternArabic',
      textBoxMeasurer: helperOptions.textBoxMeasurer
    },
    showLineNumbers: true,
    lineNumbersOptions: {
      fontFamily: fontFamily,
      fontSize: Typesetter.pt2px(params.lineNumbersFontSizeInPts),
      frequency: 5,
      numeralSystem: edition.lang === 'ar' ? 'EasternArabic' : 'WesternArabic',
      align: lineNumbersAlign,
      resetEachPage: params.resetLineNumbersEachPage,
      xPosition: lineNumbersX,
      textBoxMeasurer: helperOptions.textBoxMeasurer,
    },
    marginaliaOptions: {
      xPosition: marginaliaX,
      defaultTextDirection: isRtl(edition.lang) ? 'rtl' : 'ltr',
      align: marginaliaAlign,
      textBoxMeasurer: helperOptions.textBoxMeasurer,
    },
    hyphenationLanguages: helper.getHyphenationLanguages(),
    textBoxMeasurer: helperOptions.textBoxMeasurer,
    getApparatusListToTypeset: (mainTextVerticalList: ItemList, apparatus, lineFrom: number, lineTo: number, resetFirstLine: boolean) => {
      return helper.generateApparatusVerticalListToTypeset(mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine);
    },
    preTypesetApparatuses: () => {
      helper.resetExtractedMetadataInfo();
      return Promise.resolve(true);
    },
    getMarginaliaForLineRange: (lineFrom: number, lineTo: number) => {
      return helper.getMarginaliaForLineRange(lineFrom, lineTo);
    },
    debug: false
  };

  const extraData = { apparatuses: edition.apparatuses }

  await helper.setup();
  const mainTextList = await helper.generateListToTypesetFromMainText();

  return {
    options: typesetterOptions,
    helper,
    helperOptions,
    mainTextList,
    extraData
  }
}

export async function getTypesetEdition(edition: Edition, styleSheet: StyleSheet, styleId: string): Promise<TypesetterDocument> {
  const params = await getTypesettingParameters(edition, styleSheet, styleId);
  const typesetter = new BasicTypesetter(params.options);
  const profiler = new BasicProfiler('Typesetting', true);
  const doc = await typesetter.typeset(params.mainTextList, params.extraData);
  profiler.stop();
  return doc;
}

export async function getApiPdfData(edition: Edition, styleSheet: StyleSheet, styleId: string): Promise<ApiTypesetPdfRequestData> {
  const params = await getTypesettingParameters(edition, styleSheet, styleId);

  // TODO: check if this is needed
  // delete browser-specific options, these will be set by the server-side process
  params.options.textBoxMeasurer = undefined;
  params.options.getApparatusListToTypeset = undefined;
  params.options.preTypesetApparatuses = undefined;
  // @ts-expect-error textBoxMeasurer should be defined, but we're deleting it on purpose
  params.helperOptions.textBoxMeasurer = undefined;
  params.options.pageNumbersOptions.textBoxMeasurer = undefined;
  params.options.marginaliaOptions.textBoxMeasurer  = undefined;
  params.options.lineNumbersOptions.textBoxMeasurer = undefined;

  return {
    options: params.options,
    helperOptions: params.helperOptions,
    mainTextList: params.mainTextList.getExportObject(),
    extraData: params.extraData
  }
}