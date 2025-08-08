import {FmtTextToken} from "@/lib/FmtText/FmtTextToken";

export class MainTextToken {
    type: string;
    fmtText: FmtTextToken[];
    editionWitnessTokenIndex: number;
    style: string;
    lang?: string;
    originalIndex?: number;
    x?: number;
    y?: number;
    lineNumber?: number;
    numberOfOccurrencesInLine?: number;
    occurrenceInLine?: number;

    getPlainText(): string;
    isEmpty(): boolean;
    setLang(lang: string): this;
    setText(theText: any, editionWitnessTokenIndex: number = -1, lang: string = ''): this;
    setStyle(style: string): this;
    setNormalSpace(editionWitnessTokenIndex: number = -1): this;
}