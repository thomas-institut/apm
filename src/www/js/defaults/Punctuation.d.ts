export class Punctuation {

    /**
     * Returns true if the given string is entirely composed
     * of punctuation characters in the given language
     * @param theString
     * @param lang
     * @return boolean
     */
    static stringIsAllPunctuation(theString: string, lang = ''): boolean;

    static characterIsPunctuation(char:string, lang = '', insideWord = false): boolean;

    /**
     * Returns true if the given string has at least one character
     * that is punctuation in the given language.
     *
     * This function takes into account peculiarities of each language.
     * For example, in Hebrew, a straight double quotation inside a
     * word does not count as punctuation.
     *
     * @param theString
     * @param lang
     */
    static stringHasPunctuation(theString: string, lang = ''): boolean;

    static sticksToPrevious(char:string, lang: string): boolean;
    static sticksToNext(char:string, lang:string): boolean;
}

export function trimPunctuation(someString:string, lang = ''): string;