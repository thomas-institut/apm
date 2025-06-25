


export class MarginalFoliationGenerator {


  /**
   * Generates a list of indices to the baseWitnessTokens
   * array corresponding to the places after which a foliation
   * mark should be added when typesetting the edition.
   *
   * @param {{}}ctData
   * @param {{}[]}baseWitnessTokens
   */
  static getFoliationMarkIndices(ctData, baseWitnessTokens) {
    if (ctData['includeInAutoMarginalFoliation'].length === 0) {
      // nothing to do when nothing is included in auto marginal foliation
      return [];
    }
    let markIndices = [];
    for (let i = 0; i < ctData['includeInAutoMarginalFoliation'].length; i++) {
      let witnessIndex = ctData['includeInAutoMarginalFoliation'][i];


    }
    return markIndices;
  }
}