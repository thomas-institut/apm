
export class NumeralStyles {

    static toDecimalWestern(n: number):string;

    /**
     *
     * @param {number}n
     * @returns {string}
     */
    static toDecimalArabic(n: number): string;

    /**
     *
     * @param {string}str
     * @return {boolean}
     */
    static isArabicNumber(str: string): boolean;

    /**
     *
     * @param {string}str
     * @return {boolean}
     */
    static isWesternNumber(str: string): boolean;

}