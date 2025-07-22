import {FmtTextToken} from "./FmtTextToken";

export class FmtTextFactory {

    /**
     * Creates a FmtText array from a string
     * @param {string} theString
     * @returns {FmtTextToken[]}
     */
    static fromString(theString: string): FmtTextToken[];

    /**
     *
     * @param {any} theThing
     * @returns {FmtTextToken[]}
     */
    static fromAnything(theThing: any): FmtTextToken[];
    static empty() : FmtTextToken[];

    /**
     *
     * @return {FmtTextToken[]}
     */
    static oneNormalSpace(): FmtTextToken[];
}
