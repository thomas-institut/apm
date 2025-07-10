/**
 * Structure to hold line information for main text items
 * after the main text is typeset.
 * This information will be used to generate appropriate line numbers in the different apparatuses
 */
export class ItemLineInfo {

  constructor () {
    this.lineNumber = -1;
    this.occurrenceInLine = 0;
    this.totalOccurrencesInLine = 0;
    this.text = '';
    this.mainTextIndex = -1;
    this.isMerged = false;
    this.mergedMainTextIndices = [];
  }
}