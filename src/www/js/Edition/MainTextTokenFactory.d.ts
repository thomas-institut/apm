import {FmtTextToken} from "@/FmtText/FmtTextToken";
import {MainTextToken} from "./MainTextToken";

export class MainTextTokenFactory {

    static createSimpleText(type: string, text: string, editionWitnessTokenIndex:number, lang = '') : MainTextToken;
    static createWithFmtText(type: string, fmtText: FmtTextToken[], editionWitnessTokenIndex: number, lang = '') : MainTextToken;
    static createNormalGlue() : MainTextToken;
    static createParagraphEnd(style = ''): MainTextToken;
    static clone(token: MainTextToken) : MainTextToken;

}