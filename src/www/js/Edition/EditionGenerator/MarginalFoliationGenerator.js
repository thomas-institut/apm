import { Apparatus } from '../Apparatus'
import { MARGINALIA } from '../../constants/ApparatusType'
import { ApparatusSubEntry } from '../ApparatusSubEntry.mjs'
import * as SubEntryType from '../SubEntryType.mjs'
import * as SubEntrySource from '../SubEntrySource.mjs'
import { ApparatusEntry } from '../ApparatusEntry.mjs'
import { FmtTextFactory } from '../../FmtText/FmtTextFactory.mjs'
import { FmtTextTokenFactory } from '../../FmtText/FmtTextTokenFactory.mjs'
import { NumeralStyles } from '../../toolbox/NumeralStyles.mjs'

export class MarginalFoliationGenerator {

  /**
   *
   * @param {CtDataInterface}ctData
   */
  constructor (ctData) {
    /** @member {CtDataInterface} ctData */
    this.ctData = ctData;
  }

  /**
   * @param {MainTextToken[]} mainText
   * @param {FoliationChangeInfoInterface[]} lastFoliations
   * @return {Apparatus}
   */
  generateMarginaliaApparatus(mainText, lastFoliations = []) {
    let app = new Apparatus();
    app.type = MARGINALIA;
    let mainTextCollationRow = this.ctData.collationMatrix[this.ctData.editionWitnessIndex];
    const foliationChanges = this.getFoliationChangeInfoArray(lastFoliations);
    console.log(`Foliation Changes`, foliationChanges);

    mainTextCollationRow.forEach( (mainTextTokenIndex, collationTableColumnNumber) => {
      if (mainTextTokenIndex === -1) {
        return;
      }
      const changesInColumn = foliationChanges.filter( (change) => {
        return change.collationTableColumn === collationTableColumnNumber;
      });
      let subEntries = [];
      changesInColumn.forEach( (change) => {
        const siglum = this.ctData.sigla[change.witnessIndex];
        let subEntry = new ApparatusSubEntry();
        subEntry.source = SubEntrySource.AUTO;
        subEntry.type = SubEntryType.AUTO_FOLIATION;
        subEntry.fmtText = this.getMarginalSubEntryFmtText(siglum, change.newFoliation);
        subEntry.witnessData = [];
        subEntries.push(subEntry);
      });
      if (subEntries.length > 0) {
        const mainTextTokenIndex = this.getMainTextIndexFromCtIndex(collationTableColumnNumber, mainText);
        if (mainTextTokenIndex === -1) {
          console.warn(`Found change associated with non-existed main text token`, {
            collationTableColumnNumber: collationTableColumnNumber,
          });
          return;
        }
        const editionWitnessTokenIndex = this.ctData.collationMatrix[this.ctData.editionWitnessIndex][collationTableColumnNumber];

        const editionWitnessToken = this.ctData.witnesses[this.ctData.editionWitnessIndex].tokens[editionWitnessTokenIndex];

        let entry = new ApparatusEntry();
        entry.from = mainTextTokenIndex;
        entry.to = mainTextTokenIndex;
        entry.subEntries = subEntries;
        entry.lemmaText = editionWitnessToken.text;
        app.entries.push(entry);
      }
    });
    return app;
  }


  /**
   *
   * @param {string}siglum
   * @param {string}foliation
   * @return {FmtTextToken[]}
   * @private
   */
  getMarginalSubEntryFmtText(siglum, foliation) {

    if (this.ctData.lang === 'ar') {
      /** @var {FmtTextToken[]}*/
      let fmtText = [];

      fmtText.push(FmtTextTokenFactory.normalText(siglum));
      fmtText.push(FmtTextTokenFactory.normalText('-'));

      let foliationParts = foliation.match(/^(\d+)([r|v]?)$/);
      if (foliationParts === null) {
        fmtText.push(FmtTextTokenFactory.normalText(foliation));
      } else {
        let [ , folioNumber, folioSuffix ] = foliationParts;
        folioSuffix = folioSuffix ?? '';
        fmtText.push(FmtTextTokenFactory.normalText(NumeralStyles.toDecimalArabic(parseInt(folioNumber))));
        if (folioSuffix === 'r') {
          folioSuffix = 'ظ';
        }
        if (folioSuffix === 'v') {
          folioSuffix = 'و';
        }
        if (folioSuffix !== '') {
          fmtText.push(FmtTextTokenFactory.normalText(folioSuffix));
        }
      }

      return fmtText;
    }

    return FmtTextFactory.fromString(`${siglum}:${foliation}`);
  }


  /**
   *
   * @param {number}ctIndex
   * @param {MainTextToken[]} mainText
   * @return {number}
   */
  getMainTextIndexFromCtIndex (ctIndex, mainText) {


    for (let i = 0; i < mainText.length; i++) {
      if (mainText[i].editionWitnessTokenIndex === this.ctData.collationMatrix[this.ctData.editionWitnessIndex][ctIndex]) {
        return i
      }
    }
    return -1
  }

  /**
   * Generates a list of foliation change information objects for the
   * witnesses that should be included in automatic marginal foliation.
   *
   * Each foliation change is associated with a non-empty column in the
   * collation table.
   *
   * If an array of foliation change info objects is given, the last foliation found
   * for a witness will be considered and no changes will be recorded until the
   * foliation for that witness change to a different value
   *
   * @param {FoliationChangeInfoInterface[]} lastFoliations
   * @return {FoliationChangeInfoInterface[]}
   */
  getFoliationChangeInfoArray(lastFoliations = []) {
    let foliationChangeInfoArray = [];
    let mainTextCollationRow = this.ctData.collationMatrix[this.ctData.editionWitnessIndex];
    let baseWitnessTokens = this.ctData.witnesses[this.ctData.editionWitnessIndex].tokens;
    this.ctData.includeInAutoMarginalFoliation.forEach( (witnessIndex) => {
      console.log(`Finding changes for witness ${witnessIndex}`)
      let lastFoliation = getLastFoliationForWitness(lastFoliations, witnessIndex);
      const witnessItems = this.ctData.witnesses[witnessIndex].items;
      mainTextCollationRow.forEach( (baseWitnessTokenIndex, collationTableColumnNumber) => {
        if (baseWitnessTokenIndex === -1) {
          return;
        }
        if (baseWitnessTokens[baseWitnessTokenIndex].tokenType === 'empty') {
          return;
        }

        const witnessTokenIndex = this.ctData.collationMatrix[witnessIndex][collationTableColumnNumber];
        if (witnessTokenIndex === -1) {
          return;
        }

        const witnessToken = this.ctData.witnesses[witnessIndex].tokens[witnessTokenIndex];

        let newFoliation = getFoliationForToken(witnessToken, witnessItems);
        if (newFoliation !== null && newFoliation !== lastFoliation) {
          foliationChangeInfoArray.push({
            collationTableColumn: collationTableColumnNumber,
            witnessIndex: witnessIndex,
            newFoliation: newFoliation
          });
          lastFoliation = newFoliation;
        }
      });
    });

    return foliationChangeInfoArray.sort( (a, b) => { return a.collationTableColumn - b.collationTableColumn;});
  }
}

/**
 * Returns the foliation of the given witness token or null
 * if the foliation cannot be determined
 *
 * @param {WitnessTokenInterface} token
 * @param {FullTxItemInterface[]} items
 * @return {string|null}
 */
function getFoliationForToken(token, items) {
  let sourceItemIndex = token.sourceItems[0]?.index
  if (sourceItemIndex === undefined) {
    return null;
  }
  return items[sourceItemIndex]?.address?.foliation ?? null;
}

/**
 * Returns the last foliation found in the given array of foliation change info objects.
 *
 * If no foliation is found in the array, returns an empty string
 *
 * @param {FoliationChangeInfoInterface[]}foliationChangeInfoArray
 * @param {number}witnessIndex
 */
function getLastFoliationForWitness(foliationChangeInfoArray, witnessIndex) {
  const changes = foliationChangeInfoArray.filter( (change) => {
    return change.witnessIndex === witnessIndex;
  }).sort( (a, b) => { return a.collationTableColumn - b.collationTableColumn;});

  if (changes.length === 0) {
    return '';
  }
  return changes[changes.length - 1].newFoliation;

}
