/**
 * Structure to hold line information for main text items
 * after the main text is typeset.
 * This information will be used to generate appropriate line numbers in the different apparatuses
 */
export class ItemLineInfo {
  lineNumber: number = -1;
  occurrenceInLine: number = 0;
  totalOccurrencesInLine: number = 0;
  text: string = '';
  mainTextIndex: number = -1;
  isMerged: boolean = false;
  mergedMainTextIndices: number[] = [];
}