import {FmtTextToken} from "@/FmtText/FmtTextToken";

export class MainTextToken {
    type: string;
    fmtText: FmtTextToken[];
    editionWitnessTokenIndex: number;
    style: string;
    lang?: string;
    originalIndex?: number;

    getPlainText(): string;
    isEmpty(): boolean;
    setLang(lang: string): this;
    setText(theText: any, editionWitnessTokenIndex: number = -1, lang: string = ''): this;
    setStyle(style: string): this;
    setNormalSpace(editionWitnessTokenIndex: number = -1): this;
}