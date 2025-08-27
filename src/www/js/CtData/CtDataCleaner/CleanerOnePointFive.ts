import {CtDataCleaner} from './CtDataCleaner';
import {SubEntryPositionsConsistencyCleaner} from './SubEntryPositionsConsistencyCleaner';
import {ApparatusEntryPositionCleaner} from './ApparatusEntryPositionCleaner';
import {DefaultApparatusesCleaner} from './DefaultApparatusesCleaner';
import {EditionWitnessTokenStringParser} from '@/toolbox/EditionWitnessTokenStringParser.mjs';
import {CtDataInterface} from "../CtDataInterface";

/**
 *
 */
export class CleanerOnePointFive extends CtDataCleaner {

  sourceSchemaVersion() {
    return '1.5';
  }

  getCleanCtData(ctData: CtDataInterface): CtDataInterface {
    // make sure all custom apparatuses are there
    let defaultApparatusesCleaner = new DefaultApparatusesCleaner({verbose: this.verbose});

    ctData = defaultApparatusesCleaner.getCleanCtData(ctData);
    // run apparatus cleaners
    let subEntryPositionsCleaner = new SubEntryPositionsConsistencyCleaner({verbose: this.verbose});
    let apparatusEntryCleaner = new ApparatusEntryPositionCleaner({verbose: this.verbose});

    let cleanData = super.getCleanCtData(ctData);
    cleanData = subEntryPositionsCleaner.getCleanCtData(cleanData);
    cleanData = apparatusEntryCleaner.getCleanCtData(cleanData);

    if (cleanData.type === 'edition' && cleanData.lang === 'he') {
      // clean up edition witness
      let editionWitnessIndex = cleanData['editionWitnessIndex'];
      cleanData.witnesses[editionWitnessIndex] = this.getCleanEditionWitness(cleanData.witnesses[editionWitnessIndex]);
    }

    if (cleanData.type === 'edition' && cleanData.witnesses.length === 2) {
      // fix '_edition_' title in single chunk editions (bug in single chunk edition generator)
      cleanData.sigla[cleanData['editionWitnessIndex']] = '-';
    }
    return cleanData;
  }

  /**
   * Adds normalizedText and normalizationSource where needed in edition witness;
   * fix non-detected intra word quotation marks
   * @param editionWitness
   */
  getCleanEditionWitness(editionWitness: any) {
    editionWitness.tokens = editionWitness.tokens.map((token: any, index: number) => {
      if (token.tokenType !== 'word') {
        // nothing to do on non-word tokens
        return token;
      }

      if (token.normalizedText !== undefined && token.normalizedText !== '') {
        // already normalized, nothing to do
        return token;
      }
      let parsedTokens = EditionWitnessTokenStringParser.parse(token.text, 'he', false, true);
      if (parsedTokens.length === 1) {
        // only one-to-one parsing is safe to (potentially) fix
        let originalTokenNormalization = token.normalizedText ?? '';
        let parsedTokenNormalization = parsedTokens[0].normalizedText ?? '';

        if (parsedTokenNormalization !== '' && originalTokenNormalization !== parsedTokenNormalization) {
          console.log(`Edition witness token ${index} fixed:`);
          token.normalizedText = parsedTokenNormalization;
          token.normalizationSource = parsedTokens[0].normalizationSource;
          console.log(token);
          return token;
        } else {
          return token;
        }
      } else {
        return token;
      }
    });
    return editionWitness;
  }
}