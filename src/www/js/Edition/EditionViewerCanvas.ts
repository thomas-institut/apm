/*
 *  Copyright (C) 2022 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */
import {Edition} from './Edition';
import {CanvasTextBoxMeasurer} from '@/lib/Typesetter2/TextBoxMeasurer/CanvasTextBoxMeasurer';
import {CanvasRenderer} from '@/lib/Typesetter2/Renderer/CanvasRenderer';
import {BrowserUtilities} from '@/toolbox/BrowserUtilities';
import {Typesetter2} from '@/lib/Typesetter2/Typesetter2';
import {EditionTypesetting, EditionTypesettingOptions} from './EditionTypesetting.js';
import {BasicTypesetter, BasicTypesetterOptions} from '@/lib/Typesetter2/BasicTypesetter';
import {isRtl} from '@/toolbox/Util';
import {BasicProfiler} from '@/toolbox/BasicProfiler';
import {Dimension} from '@/lib/Typesetter2/Dimension';
import {StyleSheet} from '@/lib/Typesetter2/Style/StyleSheet';
import {TypesetterDocument} from "@/lib/Typesetter2/TypesetterDocument";
import {ItemList} from "@/lib/Typesetter2/ItemList";
import {MarginaliaAlignDirection} from "@/lib/Typesetter2/PageProcessor/AddMarginalia";

const pageMarginInCanvas = 20;

const doubleVerticalLine = String.fromCodePoint(0x2016);
const verticalLine = String.fromCodePoint(0x007c);

interface MarginDef {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

interface PageGeometry {
  pageWidth: number;
  pageHeight: number;
  lineWidth: number;
  mainTextLineHeight: number;
  mainTextFontSize: number;
  apparatusLineHeight: number;
  apparatusFontSize: number;
  margin:MarginDef;
  textToLineNumbers: number;
  textToMarginalia: number;
  textToApparatus: number;
  interApparatus: number;
  normalSpaceWidthInEms: number;
}

export interface EditionViewerCanvasOptions {
  edition: Edition;
  editionStyleSheet: StyleSheet;
  canvasElement: HTMLCanvasElement;
  fontFamily: string;
  scale?: number;
  entrySeparator?: string;
  apparatusLineSeparator?: string;
  pageWidthInCm?: number;
  pageHeightInCm?: number;
  marginInCm?:MarginDef;
  mainTextFontSizeInPts?: number;
  lineNumbersFontSizeInPts?: number;
  resetLineNumbersEachPage?: boolean;
  apparatusFontSizeInPts?: number;
  mainTextLineHeightInPts?: number;
  apparatusLineHeightInPts?: number;
  normalSpaceWidthInEms?: number;
  textToLineNumbersInCm?: number;
  textToMarginaliaInCm?: number;
  textToApparatusInCm?: number;
  interApparatusInCm?: number;
  debug?: boolean;
}

interface TypesettingParameters {
  mainTextVerticalListToTypeset: ItemList;
  typesetterOptions: BasicTypesetterOptions;
  helperOptions: EditionTypesettingOptions;
  extraData: { [p: string]: any;}
}

export class EditionViewerCanvas {

  private options: Required<EditionViewerCanvasOptions>;
  private geometry: PageGeometry;
  private readonly edition: Edition;
  private readonly canvas: HTMLCanvasElement;
  private readonly debug: boolean;
  private canvasRenderer: CanvasRenderer;
  private readonly canvasMeasurer: CanvasTextBoxMeasurer;
  private currentScale: number;
  private editionDoc: TypesetterDocument | null;
  private rawMainTextVerticalListToTypeset!: { [p: string]: any; };
  // private mainTextVerticalListToTypeset!: ItemList;
  private typesettingParameters: TypesettingParameters | null = null;

  constructor(options: EditionViewerCanvasOptions) {

    const defaults = {
      scale: 1,
      entrySeparator: verticalLine,
      apparatusLineSeparator: doubleVerticalLine,
      pageWidthInCm: 21,
      pageHeightInCm: 29.7,
      marginInCm: {
        top: 2,
        left: 3,
        bottom: 2,
        right: 3
      },
      mainTextFontSizeInPts: 12,
      lineNumbersFontSizeInPts: 10,
      resetLineNumbersEachPage: false,
      apparatusFontSizeInPts: 10,
      mainTextLineHeightInPts: 15,
      apparatusLineHeightInPts: 12,
      normalSpaceWidthInEms: 0.33,
      textToLineNumbersInCm: 0.5,
      textToMarginaliaInCm: 0.3,
      textToApparatusInCm: 1.5,
      interApparatusInCm: 0.5,
      debug: false
    };

    this.options = {
      ...defaults,
      ...options,
      marginInCm: {
        ...defaults.marginInCm,
        ...options.marginInCm
      }
    };

    this.geometry = {
      pageWidth: Typesetter2.cm2px(this.options.pageWidthInCm),
      pageHeight: Typesetter2.cm2px(this.options.pageHeightInCm),
      lineWidth: Typesetter2.cm2px(this.options.pageWidthInCm - this.options.marginInCm.left - this.options.marginInCm.right),
      mainTextLineHeight: Typesetter2.pt2px(this.options.mainTextLineHeightInPts),
      mainTextFontSize: Typesetter2.pt2px(this.options.mainTextFontSizeInPts),
      apparatusLineHeight: Typesetter2.pt2px(this.options.apparatusLineHeightInPts),
      apparatusFontSize: Typesetter2.pt2px(this.options.apparatusFontSizeInPts),
      margin: {
        top: Typesetter2.cm2px(this.options.marginInCm.top),
        left: Typesetter2.cm2px(this.options.marginInCm.left),
        bottom: Typesetter2.cm2px(this.options.marginInCm.bottom),
        right: Typesetter2.cm2px(this.options.marginInCm.right)
      },
      textToLineNumbers: Typesetter2.cm2px(this.options.textToLineNumbersInCm),
      textToMarginalia: Typesetter2.cm2px(this.options.textToMarginaliaInCm),
      textToApparatus: Typesetter2.cm2px(this.options.textToApparatusInCm),
      interApparatus: Typesetter2.cm2px(this.options.interApparatusInCm),
      normalSpaceWidthInEms: this.options.normalSpaceWidthInEms
    };

    this.edition = this.options.edition;
    this.canvas = this.options.canvasElement;
    this.debug = this.options.debug;
    this.canvasRenderer = new CanvasRenderer(this.canvas);
    BrowserUtilities.setCanvasHiPDI(this.canvas, Math.round(this.geometry.pageWidth), Math.round(this.geometry.pageHeight));

    this.canvasRenderer.setScale(this.options.scale).setPageMargin(pageMarginInCanvas);
    this.canvasMeasurer = new CanvasTextBoxMeasurer();
    this.currentScale = this.options.scale;
    this.editionDoc = null;
  }

  getTypesettingParameters() {
    return this.typesettingParameters;
  }

  async render(): Promise<void> {
    if (this.editionDoc === null) {
      // need to typeset the edition
      const doc = await this.__typesetEdition();
      this.editionDoc = doc;
      this.renderCanvas(doc);
    } else {
      this.renderCanvas(this.editionDoc);
    }
  }

  getTypesetEdition() {
    return this.editionDoc;
  }


  async setScale(newScale: number): Promise<number> {
    this.canvasRenderer.setScale(newScale);
    try {
      await this.render();
      this.currentScale = newScale;
      return newScale;
    } catch (err) {
      console.error(`Error rendering canvas`);
      console.log(err);
      throw err;
    }
  }

  getCurrentScale() {
    return this.currentScale;
  }

  private renderCanvas(doc: TypesetterDocument) {
    let [canvasWidth, canvasHeight] = this.canvasRenderer.getCanvasDimensionsForDoc(doc);
    BrowserUtilities.setCanvasHiPDI(this.canvas, canvasWidth, canvasHeight);
    let ctx = this.canvas.getContext('2d');
    ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (doc.getPageCount() === 0) {
      console.log('Nothing to do, no pages to render');
      return;
    }
    // this.debug && console.log(`Rendering canvas`)
    this.canvasRenderer.renderDocument(doc);
  }

  getMainTextListToTypeset() {
    return this.rawMainTextVerticalListToTypeset;
  }

  __typesetEdition() : Promise<TypesetterDocument>{
    return new Promise(async (resolve) => {
      // reset typesetting data
      this.typesettingParameters = null;
      let helperOptions: EditionTypesettingOptions = {
        edition: this.edition,
        editionStyleSheet: this.options.editionStyleSheet,
        // defaultFontFamily: this.options.fontFamily,
        // defaultFontSize: Typesetter2.pt2px(this.options.mainTextFontSizeInPts),
        textBoxMeasurer: this.canvasMeasurer,
        debug: false
      };
      // Load fonts
      console.log(`Loading fonts`);
      let fontsToLoad: string[] = [];
      this.options.editionStyleSheet.getFontFamilies().forEach((fontFamily) => {
        fontsToLoad.push(`1em ${fontFamily}`, `bold 1em ${fontFamily}`, `italic 1em ${fontFamily}`, `bold italic 1em ${fontFamily}`);
      });

      for (let i = 0; i < fontsToLoad.length; i++) {
        await document.fonts.load(fontsToLoad[i]);
        console.log(` Loaded ${fontsToLoad[i]} `);
      }
      let editionTypesettingHelper = new EditionTypesetting(helperOptions);
      editionTypesettingHelper.setup().then(async () => {
        let verticalListToTypeset = await editionTypesettingHelper.generateListToTypesetFromMainText();
        this.rawMainTextVerticalListToTypeset = verticalListToTypeset.getExportObject();
        // this.mainTextVerticalListToTypeset = verticalListToTypeset;
        this.debug && console.log(`List to typeset`,verticalListToTypeset)
        let lineNumbersAlign = 'right';
        let lineNumbersX = this.geometry.margin.left - this.geometry.textToLineNumbers;
        let marginaliaX = this.geometry.pageWidth - this.geometry.margin.right + this.geometry.textToMarginalia;
        let marginaliaAlign: MarginaliaAlignDirection = 'left';
        if (isRtl(this.edition.lang)) {
          lineNumbersAlign = 'left';
          lineNumbersX = this.geometry.pageWidth - this.geometry.margin.right + this.geometry.textToLineNumbers;
          marginaliaAlign = 'right';
          marginaliaX = this.geometry.margin.left - this.geometry.textToMarginalia;
        }
        this.typesettingParameters = {
          mainTextVerticalListToTypeset: verticalListToTypeset,
          helperOptions: helperOptions,
          typesetterOptions: {
            pageWidth: this.geometry.pageWidth,
            pageHeight: this.geometry.pageHeight,
            marginTop: this.geometry.margin.top,
            marginBottom: this.geometry.margin.bottom,
            marginLeft: this.geometry.margin.left,
            marginRight: this.geometry.margin.right,
            defaultFontFamily: this.options.fontFamily,
            defaultFontSize: this.geometry.mainTextFontSize,
            lineSkip: this.geometry.mainTextLineHeight,
            apparatusLineSkip: Dimension.pt2px(this.options.apparatusLineHeightInPts),
            textToApparatusGlue: {
              height: this.geometry.textToApparatus,
              shrink: this.geometry.textToApparatus * 0.1,
              stretch: this.geometry.pageHeight - this.geometry.margin.bottom - this.geometry.margin.top
            },
            interApparatusGlue: {
              height: this.geometry.interApparatus, shrink: 0, stretch: 0
            },
            showPageNumbers: true,
            pageNumbersOptions: {
              fontFamily: this.options.fontFamily,
              fontSize: this.geometry.mainTextFontSize,
              numeralSystem: this.edition.lang === 'ar' ? 'EasternArabic' : 'WesternArabic',
              textBoxMeasurer: this.canvasMeasurer
            },
            showLineNumbers: true,
            lineNumbersOptions: {
              fontFamily: this.options.fontFamily,
              fontSize: Typesetter2.pt2px(this.options.lineNumbersFontSizeInPts),
              frequency: 5,
              numeralSystem: this.edition.lang === 'ar' ? 'EasternArabic' : 'WesternArabic',
              align: lineNumbersAlign,
              resetEachPage: this.options.resetLineNumbersEachPage,
              xPosition: lineNumbersX,
              textBoxMeasurer: this.canvasMeasurer,
            },
            marginaliaOptions: {
              xPosition: marginaliaX,
              defaultTextDirection: isRtl(this.edition.lang) ? 'rtl' : 'ltr',
              align: marginaliaAlign,
              textBoxMeasurer: this.canvasMeasurer,
            },
            textBoxMeasurer: this.canvasMeasurer,
            getApparatusListToTypeset: (mainTextVerticalList: ItemList, apparatus, lineFrom:number, lineTo:number, resetFirstLine:boolean) => {
              return editionTypesettingHelper.generateApparatusVerticalListToTypeset(mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine);
            },
            preTypesetApparatuses: () => {
              editionTypesettingHelper.resetExtractedMetadataInfo();
              return Promise.resolve(true);
            },
            getMarginaliaForLineRange: (lineFrom: number, lineTo: number) => {
              return editionTypesettingHelper.getMarginaliaForLineRange(lineFrom, lineTo);
            },
            debug: false
          },
          extraData: {apparatuses: this.edition.apparatuses}
        };
        let ts = new BasicTypesetter(this.typesettingParameters.typesetterOptions);
        let profiler = new BasicProfiler('Typesetting', true);
        let tsOutput = await ts.typeset(verticalListToTypeset, this.typesettingParameters.extraData);
        profiler.stop('last');
        console.log(`Typeset doc`);
        console.log(tsOutput);
        resolve(tsOutput);
      });
    });
  }

}