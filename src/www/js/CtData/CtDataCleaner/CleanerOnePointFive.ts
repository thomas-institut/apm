import {CtDataCleaner} from './CtDataCleaner';
import {SubEntryPositionsConsistencyCleaner} from './SubEntryPositionsConsistencyCleaner';
import {ApparatusEntryPositionCleaner} from './ApparatusEntryPositionCleaner';
import {DefaultApparatusesCleaner} from './DefaultApparatusesCleaner';
import {EditionWitnessTokenStringParser} from '@/toolbox/EditionWitnessTokenStringParser.mjs';
import {CtDataInterface, NonTokenItemIndex} from "../CtDataInterface";
import {getNonTokenItemIndices} from "@/Witness/TranscriptionWitness";
import {arraysAreEqual} from "@/lib/ToolBox/ArrayUtil";

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


    // Check non item indices

    console.log(`Checking consistency in nonTokenItemIndices...`);
    let allGood = true;

    cleanData.witnesses.forEach((witness, index) => {
      if (witness.tokens === undefined) {
        return;
      }
      if (witness.items === undefined) {
        return;
      }
      if (witness.nonTokenItemIndexes === undefined) {
        console.warn(`Witness ${index}: nonTokenItemIndexes is undefined`);
        return;
      }
      const inCtData = witness.nonTokenItemIndexes;
      const calculated = getNonTokenItemIndices(witness.tokens, witness.items);
      const clean: {[key: number]: NonTokenItemIndex} = [];
      for (let i=0; i < calculated.length; i++) {
        if (calculated[i].pre.length === 0 && calculated[i].post.length === 0) {
          continue;
        }
        clean[i] = calculated[i];
      }

      let consistent = true;

      const inCtDataSlots = Object.keys(inCtData).map((key) => {return parseInt(key)});
      const cleanSlots = Object.keys(clean).map((key) => {return parseInt(key)});
      if (!arraysAreEqual(inCtDataSlots, cleanSlots)) {
        consistent = false;
      } else {
        inCtDataSlots.forEach((index) => {
          if (!arraysAreEqual(inCtData[index].pre, clean[index].pre)) {
            consistent = false;
            return;
          }
          if (!arraysAreEqual(inCtData[index].post, clean[index].post)) {
            consistent = false;
          }
        });
      }

      if (!consistent) {
        allGood = false;
        console.warn(`Inconsistent witness ${index}`, witness.nonTokenItemIndexes, clean);
      }

    });
    if (allGood) {
      console.log('... all good!');
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