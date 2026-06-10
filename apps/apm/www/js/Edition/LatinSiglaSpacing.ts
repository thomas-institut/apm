/**
 * Determines the indices of sigla that should have a space after them.
 *
 * A space is required for sigla n if the last character of sigla[n-1] is lowercase or the first character of sigla[n]
 * is also lowercase.
 *
 *
 * @param sigla
 */
export function getLatinSiglaSpacing(sigla: string[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < sigla.length - 1; i++) {
        const current = sigla[i];
        const next = sigla[i + 1];

        const currentLastChar = current[current.length - 1];
        const nextFirstChar = next[0];

        if ((currentLastChar >= 'a' && currentLastChar <= 'z') || (nextFirstChar >= 'a' && nextFirstChar <= 'z')) {
            result.push(i);
        }
    }
    return result;
}