import {FmtTextToken} from "./FmtTextToken.mjs";


export class FmtText {
    static getPlainText(fmtText: FmtTextToken[]) : string;
    static check(fmtText: FmtTextToken[]): void;
    static concat(fmtText1:FmtTextToken[], fmtText2: FmtTextToken[]): FmtTextToken[];
    static withPlainText(fmtText: FmtTextToken[], newPlainText: string): FmtTextToken[];
}