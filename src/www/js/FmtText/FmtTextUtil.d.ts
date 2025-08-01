import {FmtTextToken} from "./FmtTextToken";
import {FmtText} from "./FmtText";

export class FmtTextUtil {

    /**
     * Returns a string with the plain text in the the given fmtText: text in the text tokens
     * and spaces instead of glue tokens. All other tokens are ignored.
     *
     * @param fmtText
     */
    static getPlainText(fmtText: FmtText) : string;
    static concat(fmtText1:FmtText, fmtText2: FmtText): FmtText;
    static withPlainText(fmtText: FmtTextToken[], newPlainText: string): FmtTextToken[];
    static getCanonical(fmtText: FmtText): FmtTextToken[];

    static tokenGetPlainText(token: FmtTextToken): string;
}