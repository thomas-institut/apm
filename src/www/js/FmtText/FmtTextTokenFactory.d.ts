import {FmtTextToken} from "./FmtTextToken";

export class FmtTextTokenFactory {

    /**
     *
     * @param {string} someString
     * @returns {FmtTextToken}
     */
    static normalText(someString: string): FmtTextToken ;

    static normalSpace():FmtTextToken;

    static paragraphMark(style = ParagraphStyle.NORMAL): FmtTextToken;

    /**
     *
     * @param fmtTextToken
     * @return {FmtTextToken}
     */
    static clone(fmtTextToken:FmtTextToken): FmtTextToken;
    /**
     *
     * @param {Object} someObject
     */
    static buildFromObject(someObject:any): FmtTextToken;
}