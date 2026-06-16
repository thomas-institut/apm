/**
 * Determines the indices of sigla that should have a space after them.
 *
 * A space is required only before the first siglum that it strictly lowercase. E.g. for [ 'Ab', 'Bx', 'Cd', 'p', 'v]
 * the function returns [2], meaning a space is required after 'Cd'.
 * 
 * Notice: this is only a temporary solution so that Massimo's edition displays correctly. The actual 
 * solution involves marking certain witnesses or sources as "non-manuscripts" and showing those always
 * after the manuscript sigla with a small space in between. In Massimo's case, he's following the convention
 * of identifying non-manuscripts by using lowercase sigla.
 * 
 *
 * @param sigla
 */
export function getLatinSiglaSpacing(sigla: string[]): number[] {
    const firstLowercaseIndex = sigla.findIndex(
        siglum => siglum === siglum.toLowerCase() && siglum !== siglum.toUpperCase(),
    );

    if (firstLowercaseIndex <= 0) {
        return [];
    }

    return [firstLowercaseIndex - 1];
}