
import * as FmtTextTokenType from './FmtTextTokenType.mjs'
import * as FontStyle from './FontStyle.mjs'
import * as FontSize from './FontSize.mjs'
import * as FontWeight from './FontWeight.mjs'
import * as VerticalAlign from './VerticalAlign.mjs'

export const DEFAULT_GLUE_SPACE = 'normal'

export class FmtTextToken {

    text: string;
    fontStyle: string;
    fontWeight: string;
    verticalAlign: string;
    fontSize: string;
    classList: string;
    textDirection: string;
    type: string;
    space: string;
    markType: string;
    style: string;
    width: number;
    stretch: number;
    shrink: number;


    constructor (type:string = FmtTextTokenType.TEXT);
    // getPlainText() : string;
    setText(text: string) :this;
    setFontSize(fontSize: string): this;
    setItalic(): this;
    setNormalSlant() : this;
    setBold(): this;
    setNormalWeight(): this;
    setLength(spaceLength: number):this;
    setSuperScript(): this;
    setSubScript(): this;
    setSmallFont(): this;
    setClass(classList: string): this;
    addClass(className: string): this;
    removeClass(className: string): this;
    setMarkType(markType: string): this;
    setStyle(style:string): this;
    setTextDirection(textDirection: string): this;
    setGlue(width: number, stretch = 0, shrink = 0 ): void;

}