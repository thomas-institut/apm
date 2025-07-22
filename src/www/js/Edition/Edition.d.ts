

// TODO: refine this after generating better definition files for
//  other dependencies (e.g., MainTextToken, etc)

import {MainTextToken} from "./MainTextToken";
import {EditionWitnessInfo} from "./EditionWitnessInfo";
import {FoliationChangeInfoInterface} from "./EditionGenerator/FoliationChangeInfoInterface";

export class Edition {
    constructor();

    lang: string;
    infoText: string;
    info: { [key: string]: any};
    mainText: MainTextToken[];
    apparatuses: any[];
    witnesses: EditionWitnessInfo[];
    siglaGroups: any[];
    foliationChanges: FoliationChangeInfoInterface

    setMainText(mainText: MainTextToken[]): this;

    setLang(lang: string): this;

    getLang(): string;

    getSigla(): string[];

    getMainTextToken(index: number): MainTextToken;

    getPlainTextForRange(from: number, to: number): string;
}

