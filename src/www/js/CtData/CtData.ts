/*
 *  Copyright (C) 2021 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import * as WitnessTokenType from '../Witness/WitnessTokenType';
import * as TranscriptionTokenType from '../Witness/WitnessTokenType';
import {SequenceWithGroups} from '@/Edition/SequenceWithGroups';
// @ts-ignore
import {Matrix} from '@thomas-inst/matrix';
import * as CollationTableType from '../constants/CollationTableType';
import {deepCopy} from '@/toolbox/Util';
import * as NormalizationSource from '../constants/NormalizationSource';
import * as WitnessType from '../Witness/WitnessTokenClass';
import {uniq} from '@/lib/ToolBox/ArrayUtil';

// cleaners
import {CleanerZero} from './CtDataCleaner/CleanerZero';
import {CleanerOnePointZero} from './CtDataCleaner/CleanerOnePointZero';
import {CleanerOnePointOne} from './CtDataCleaner/CleanerOnePointOne';
// updaters
import {UpdaterToOnePointZero} from './CtDataUpdater/UpdaterToOnePointZero';
import {UpdaterToOnePointOne} from './CtDataUpdater/UpdaterToOnePointOne';
import {UpdaterToOnePointTwo} from './CtDataUpdater/UpdaterToOnePointTwo';
import {CleanerOnePointTwo} from './CtDataCleaner/CleanerOnePointTwo';
import {UpdaterToOnePointThree} from './CtDataUpdater/UpdaterToOnePointThree';
import {CleanerOnePointThree} from './CtDataCleaner/CleanerOnePointThree';
import {CleanerOnePointFour} from './CtDataCleaner/CleanerOnePointFour';
import {UpdaterToOnePointFour} from './CtDataUpdater/UpdaterToOnePointFour';
import {UpdaterToOnePointFive} from "./CtDataUpdater/UpdaterToOnePointFive";
import {CleanerOnePointFive} from "./CtDataCleaner/CleanerOnePointFive";
import {Punctuation} from '@/defaults/Punctuation';
import {
  ColumnInformation,
  CtDataInterface,
  CustomApparatusEntryInterface,
  CustomApparatusInterface,
  NonTokenItemIndex,
  WitnessInterface,
  WitnessTokenInterface
} from "./CtDataInterface";
import {FULL_TX} from "@/Witness/WitnessType";
import {NormalizerRegister} from "@/pages/common/NormalizerRegister";


/*
 A collection of static methods to manipulate the CtData  structure
 */


const schemaVersions = ['0', '1.0', '1.1', '1.2', '1.3', '1.4', '1.5'];


export class CtData {

  static generateCsv(ctData: CtDataInterface, sep = ',', showNormalizations = false): string {
      let sigla = ctData.sigla;
      let numWitnesses = ctData.witnesses.length;

      let output = '';
      let witnessesToInclude = [];
      for(let i = 0; i < numWitnesses; i++) {
        if (ctData.witnesses[i].witnessType === FULL_TX) {
          witnessesToInclude.push(i);
        }
      }

      if (ctData.type === CollationTableType.EDITION) {
        witnessesToInclude =  [ ctData.editionWitnessIndex, ...witnessesToInclude ];
      }



      for (let k = 0; k < witnessesToInclude.length; k++) {
        let witnessIndex = witnessesToInclude[k];
        let siglum = sigla[witnessIndex];
        output += siglum + sep;
        let ctRefRow = ctData.collationMatrix[witnessIndex];
        for (let tkRefIndex = 0; tkRefIndex < ctRefRow.length; tkRefIndex++) {
          let tokenRef = ctRefRow[tkRefIndex];
          let tokenCsvRep = '';
          if (tokenRef !== -1) {
            let token = ctData.witnesses[witnessIndex].tokens[tokenRef];
            tokenCsvRep = this.getCsvRepresentationForToken(token, showNormalizations);
          }
          output += tokenCsvRep + sep;
        }
        output += '\n';
      }
      return output;
  }

  private static getCsvRepresentationForToken(tkn: WitnessTokenInterface, showNormalizations: boolean) {
    if (tkn.tokenType === 'empty') {
      return '';
    }
    let text = tkn.text;
    if (showNormalizations && tkn.normalizedText !== undefined) {
      text = tkn.normalizedText ;
    }
    return '"' + text + '"';
  }

  /**
   * Returns the pageIds used in every witness in ctData
   * @param {CtDataInterface}ctData
   */
  static getPageIds(ctData: CtDataInterface): any[] {
    return ctData.witnesses.map((witness, index) => {
      if (witness.witnessType !== FULL_TX) {
        return [];
      }
      if (witness.items === undefined) {
        console.warn(`FullTx witness ${index} has no items`);
        return [];
      }
      return uniq(witness.items.map((item) => {
        return item.address.pageId;
      }).sort());
    });
  }

  /**
   * Returns an array with information about every column present in a fullTx witness
   */
  static getColumnsForWitness(ctData: CtDataInterface, witnessIndex: number): ColumnInformation[] {
    if (ctData.witnesses[witnessIndex] === undefined) {
      return [];
    }
    let witness = ctData.witnesses[witnessIndex];
    if (witness.witnessType !== WitnessType.FULL_TX) {
      return [];
    }
    if (witness.items === undefined) {
      console.warn(`FullTx witness ${witnessIndex} has no items`);
      return [];
    }
    let colStringArray: string[] = uniq(witness['items'].map((item) => {
      return `${item.address.pageId}-${item.address.column}`;
    }));

    return colStringArray.map((colString) => {
      let fields = colString.split('-');
      return {
        pageId: parseInt(fields[0]), column: parseInt(fields[1])
      };
    });
  }


  /**
   * Returns an array of WitnessTokens with the tokens in the given column of the CtData's
   * collation table
   *
   * @param ctData
   * @param col
   */
  static getCollationTableColumn(ctData: CtDataInterface, col: number): WitnessTokenInterface[] {
    let column: WitnessTokenInterface[] = [];
    ctData.collationMatrix.forEach((tokenRefs, row) => {
      let ref = tokenRefs[col];
      const tokens = ctData.witnesses[row].tokens;
      if (ref === -1 || tokens === undefined) {
        column[row] = {fmtText: [], text: "", tokenClass: "", tokenType: WitnessTokenType.EMPTY};
      } else {
        column[row] = tokens[ref];
      }
    });
    return column;
  }

  static getCleanAndUpdatedCtData(sourceCtData: CtDataInterface, verbose = true, debug = false): CtDataInterface {

    function getCleanerForSchemaVersion(sourceSchemaVersion: string, verbose: boolean, debug: boolean) {
      switch (sourceSchemaVersion) {
        case '0':
          return new CleanerZero({verbose: verbose, debug: debug});
        case '1.0':
          return new CleanerOnePointZero({verbose: verbose, debug: debug});
        case '1.1':
          return new CleanerOnePointOne({verbose: verbose, debug: debug});

        case '1.2':
          return new CleanerOnePointTwo({verbose: verbose, debug: debug});

        case '1.3':
          return new CleanerOnePointThree({verbose: verbose, debug: debug});

        case '1.4':
          return new CleanerOnePointFour({verbose: verbose, debug: debug});

        case '1.5':
          return new CleanerOnePointFive({verbose: verbose, debug: debug});

        default:
          throw new Error(`Invalid source schema ${sourceSchemaVersion} requested`);
      }
    }

    function getUpdaterForTargetSchemaVersion(targetSchemaVersion: string, verbose: boolean, debug: boolean) {
      switch (targetSchemaVersion) {
        case '1.0':
          return new UpdaterToOnePointZero({verbose: verbose, debug: debug});

        case '1.1':
          return new UpdaterToOnePointOne({verbose: verbose, debug: debug});

        case '1.2':
          return new UpdaterToOnePointTwo({verbose: verbose, debug: debug});

        case '1.3':
          return new UpdaterToOnePointThree({verbose: verbose, debug: debug});

        case '1.4':
          return new UpdaterToOnePointFour({verbose: verbose, debug: debug});

        case '1.5':
          return new UpdaterToOnePointFive({verbose: verbose, debug: debug});

        default:
          throw new Error(`Invalid target schema ${targetSchemaVersion} requested`);
      }
    }

    if (sourceCtData.schemaVersion === undefined) {
      sourceCtData.schemaVersion = '0';
    }
    if (debug) {
      verbose = true;
    }

    let currentSchemaVersionIndex = schemaVersions.indexOf(sourceCtData['schemaVersion']);
    if (currentSchemaVersionIndex === -1) {
      throw new Error(`Invalid CtData schema version found: ${sourceCtData['schemaVersion']}`);
    }
    let ctData = sourceCtData;
    while (currentSchemaVersionIndex < schemaVersions.length) {
      // clean the data
      let cleaner = getCleanerForSchemaVersion(ctData['schemaVersion'], verbose, debug);
      ctData = cleaner.getCleanCtData(ctData);
      if (currentSchemaVersionIndex !== schemaVersions.length - 1) {
        // not the latest schema version, so update
        let updater = getUpdaterForTargetSchemaVersion(schemaVersions[currentSchemaVersionIndex + 1], verbose, debug);
        ctData = updater.update(ctData);
      }
      currentSchemaVersionIndex++;
    }

    return ctData;

  }

  /**
   * Returns a copy of a CtDataObject
   */
  static copyFromObject(ctDataObject: any) {
    // console.log(`Copying ctData`)
    let ctData: CtDataInterface = deepCopy(ctDataObject);
    // console.log(ctData)
    ctData = this.fixFmtText(ctData);
    return ctData;
  }

  static fixFmtText(ctData: CtDataInterface): CtDataInterface {
    if (ctData.customApparatuses === undefined) {
      // not an edition
      return ctData;
    }
    // fix FmtText
    for (let i = 0; i < ctData.customApparatuses.length; i++) {
      for (let entryN = 0; entryN < ctData.customApparatuses[i].entries.length; entryN++) {
        for (let subEntryN = 0; subEntryN < ctData.customApparatuses[i].entries[entryN].subEntries.length; subEntryN++) {
          if (ctData.customApparatuses[i].entries[entryN].subEntries[subEntryN].fmtText !== undefined) {
            // this is a custom entry, other types do not have a fmtText
            //ctData.customApparatuses[i].entries[entryN].subEntries[subEntryN].fmtText = ctData.customApparatuses[i].entries[entryN].subEntries[subEntryN].fmtText;
          }
        }
      }
    }
    return ctData;
  }

  /**
   * Finds and returns a non-empty main text token index based on the given parameters.
   * The method iterates through tokens, skipping those classified as punctuation-only or empty,
   * moving forward or backward based on the `forward` parameter.
   *
   * @param {number} ctIndex - The starting index to search for a non-empty main text token.
   * @param {number[]} ctIndexToMainTextMap - A mapping array that maps token indices to main text indices.
   * @param {WitnessTokenInterface[]} baseWitnessTokens - An array of token objects, each with a `text` property.
   * @param {boolean} forward - A flag indicating the search direction (true for forward, false for backward).
   * @param {string} [lang=''] - The language code for interpreting punctuation (optional, defaults to an empty string).
   * @return {number} The index of the found main text token, or -1 if no valid token is found.
   */
  static findNonEmptyMainTextToken(ctIndex: number, ctIndexToMainTextMap: number[], baseWitnessTokens: WitnessTokenInterface[], forward: boolean, lang: string = ''): number {
    while (ctIndex >= 0 && ctIndex < ctIndexToMainTextMap.length && (ctIndexToMainTextMap[ctIndex] === -1 || Punctuation.stringIsAllPunctuation(baseWitnessTokens[ctIndex]['text'], lang))) {
      ctIndex = forward ? ctIndex + 1 : ctIndex - 1;
    }
    if (ctIndex < 0 || ctIndex >= ctIndexToMainTextMap.length) {
      return -1;
    }
    return ctIndexToMainTextMap[ctIndex];
  }


  /**
   * Updates ctData with the given entry, which is normally produced by the apparatus entry editor
   * in EditionComposer's ApparatusPanel
   */
  static updateCustomApparatuses(ctData: CtDataInterface, apparatusType: string, editedEntry: CustomApparatusEntryInterface): CtDataInterface {
    console.log(`Updating customs apparatuses for apparatus '${apparatusType}'`, editedEntry);
    console.log(editedEntry);

    // First, let's get the right apparatus
    let apparatusIndex = ctData.customApparatuses.map((app) => {
      return app.type;
    }).indexOf(apparatusType);

    if (apparatusIndex === -1) {
      throw new Error(`Unknown apparatus type ${apparatusType}`);
    }

    let customApparatus = ctData.customApparatuses[apparatusIndex];
    let newEntry: CustomApparatusEntryInterface = deepCopy(editedEntry);
    // newEntry.preLemma = '';
    // newEntry.lemmaText = '';

    // new entry, first get the auto subEntries
    newEntry.subEntries = editedEntry.subEntries.filter((subEntry) => {
      return subEntry.type === 'auto';
    });
    // add all other subEntries
    newEntry.subEntries.push(...editedEntry.subEntries.filter((subEntry) => {
      return subEntry.type !== 'auto';
    }));
    console.log(`New Entry`);
    console.log(deepCopy(newEntry));

    // Does the entry exist already?
    let entryIndex = customApparatus.entries.map((entry) => {
      return `${entry.from}-${entry.to}`;
    }).indexOf(`${editedEntry.from}-${editedEntry.to}`);
    console.log(`Entry Index: ${entryIndex}`);

    // Is this an entry that actually changes anything?
    if (this.isEntryEqualToDefault(newEntry)) {
      console.log(`New entry is equal to default`);
      if (entryIndex !== -1) {
        console.log(`Deleting entry that is now equal to default`);
        ctData.customApparatuses[apparatusIndex].entries = ctData.customApparatuses[apparatusIndex].entries.filter((_entry, index) => {
          return index !== entryIndex;
        });
      }
    } else {
      if (entryIndex === -1) {
        console.log(`Adding new entry`);
        ctData.customApparatuses[apparatusIndex].entries.push(newEntry);
      } else {
        console.log(`Replacing existing entry ${entryIndex}`);
        ctData.customApparatuses[apparatusIndex].entries[entryIndex] = newEntry;
      }
    }

    return ctData;
  }

  static isEntryEqualToDefault(entry: CustomApparatusEntryInterface): boolean {
    if (entry.subEntries.length !== 0) {
      return false;
    }
    let vars = ['preLemma', 'lemma', 'postLemma', 'separator'];
    for (let i = 0; i < vars.length; i++) {
      // @ts-ignore
      if (entry[vars[i]] !== '') {
        return false;
      }
    }
    return true;
  }

  /**
   * Empties a token in a witness
   * @param ctData
   * @param {number} witnessIndex
   * @param {number} tokenIndex
   */
  static emptyWitnessToken(ctData: CtDataInterface, witnessIndex: number, tokenIndex: number) {
   if (ctData.witnesses[witnessIndex].tokens === undefined) {
      return ctData;
    }
    ctData.witnesses[witnessIndex].tokens[tokenIndex].text = '';
    ctData.witnesses[witnessIndex].tokens[tokenIndex].tokenType = WitnessTokenType.EMPTY;
    if (ctData.type === CollationTableType.EDITION && witnessIndex === ctData.editionWitnessIndex) {
      // find CT column that refers to this token
      let ctColumnIndex = ctData.collationMatrix[witnessIndex].indexOf(tokenIndex);
      if (ctColumnIndex === -1) {
        // no reference to this token in collation table, so nothing to do
        return ctData;
      }
      return this.fixReferencesToEmptyTokensInEditionWitness(ctData, ctColumnIndex);
    }
    return ctData;
  }

  /**
   * Fixes references to empty token in the editionWitness
   * @param ctData
   * @param ctColumnIndex the CT column, if -1, looks into all columns
   */
  static fixReferencesToEmptyTokensInEditionWitness(ctData: CtDataInterface, ctColumnIndex = -1) {
    if (ctData.type !== CollationTableType.EDITION) {
      return ctData;
    }
    let editionWitnessIndex = ctData.editionWitnessIndex;
    let ctRow = ctData.collationMatrix[editionWitnessIndex];
    let editionWitnessTokens = ctData.witnesses[editionWitnessIndex].tokens;
    if (editionWitnessTokens === undefined) {
      throw new Error(`Edition witness ${editionWitnessIndex} has no tokens`);
    }
    let ctColumnStart = 0;
    let ctColumnEnd = ctRow.length - 1;
    if (ctColumnIndex >= 0) {
      ctColumnStart = ctColumnIndex;
      ctColumnEnd = ctColumnIndex;
    }

    //console.log(`Fixing references to empty tokens from column ${ctColumnStart} to ${ctColumnEnd}`)

    for (let column = ctColumnStart; column < ctRow.length && column <= ctColumnEnd; column++) {
      if (editionWitnessTokens[ctRow[column]].tokenType !== WitnessTokenType.EMPTY) {
        //console.log(`Edition witness at ${column} (index ${ctRow[column]} is not empty (type =  ${editionWitnessTokens[ctRow[column]].tokenType}) `)
        continue;
      }
      // console.log(`Edition witness token is empty at column ${column}`)
      ctData.customApparatuses.forEach((app) => {
        const entriesToDelete: number[] = [];
        app.entries = app.entries.map((entry, entryIndex) => {
          if (entry.from !== entry.to) {
            // the default action for entries associated with a range of columns
            // in which one of the ends of the range is an empty token is to
            // shrink the range
            if (entry.from === column) {
              // find the next non-empty token in the range
              let newFrom = -1;
              for (let j = entry.from + 1; j <= entry.to; j++) {
                if (ctRow[j] !== -1 && editionWitnessTokens[ctRow[j]].tokenType !== WitnessTokenType.EMPTY) {
                  newFrom = j;
                  break;
                }
              }
              if (newFrom !== -1) {
                console.warn(`Changed entry.from index in apparatus '${app.type}' to non-empty token. Before: ${entry.from}, after: ${newFrom}`);
                console.log(entry);
                entry.from = newFrom;
              } else {
                // mark the entry so that the filter below deletes it
                entriesToDelete.push(entryIndex);
                //entry.toDelete = true
              }
            }
            if (entry.to === column) {
              // find the next non-empty token in the range
              let newTo = -1;
              for (let j = entry.to - 1; j >= entry.from; j--) {
                if (ctRow[j] !== -1 && editionWitnessTokens[ctRow[j]].tokenType !== WitnessTokenType.EMPTY) {
                  newTo = j;
                  break;
                }
              }
              if (newTo !== -1) {
                console.warn(`Changed entry.to index in apparatus '${app.type}' to non-empty token. Before: ${entry.to}, after: ${newTo}`);
                console.log(entry);
                entry.to = newTo;
              } else {
                // mark the entry so that the filter below deletes it
                entriesToDelete.push(entryIndex);
                // entry.toDelete = true;
              }
            }
          }
          return entry;
        }).filter((entry, entryIndex) => {
          // remove entries marked for deletion
          if (entriesToDelete.indexOf(entryIndex) !== -1) {
            console.warn(`Removing multi-column custom apparatus entry in '${app.type}' with an end of the range referring to empty token  (ctCol ${column})`);
            console.log(entry);
            return false;
          }
          // remove single-column entries that refer to the token
          if (entry.from === column || entry.to === column) {
            console.warn(`Removing single-column custom apparatus entry in '${app.type}' referring to empty token  (ctCol ${column})`);
            console.log(entry);
            return false;
          }
          return true;
        });
      });
    }

    return ctData;
  }

  static fixDuplicatedEntriesInCustomApparatuses(ctData: CtDataInterface) {
    if (ctData.type !== CollationTableType.EDITION) {
      return ctData;
    }
    ctData.customApparatuses.forEach((app, appIndex) => {
      let entryCounts: any = [];
      app.entries.forEach((entry, entryIndex) => {
        let key = `${entry.from}_${entry.to}`;
        if (entryCounts[key] === undefined) {
          entryCounts[key] = {from: entry.from, to: entry.to, indexes: [entryIndex]};
        } else {
          entryCounts[key].indexes.push(entryIndex);
        }
      });
      let entriesToDelete: any = [];
      Object.keys(entryCounts).forEach((ecKey) => {
        let ec = entryCounts[ecKey];
        if (ec.indexes.length > 1) {
          // duplicated entry
          console.log(`Duplicated entry in custom apparatus '${app.type}' from ${ec.from} to ${ec.to}, indexes ${ec.indexes.join(', ')}`);
          // remove all but the last entry
          for (let i = 0; i < ec.indexes.length - 1; i++) {
            console.log(`... entry ${ec.indexes[i]} will be deleted`);
            entriesToDelete.push(ec.indexes[i]);
          }
        }
      });
      if (entriesToDelete.length > 0) {
        ctData.customApparatuses[appIndex].entries = ctData.customApparatuses[appIndex].entries.filter((_entry, entryIndex) => {
          return entriesToDelete.indexOf(entryIndex) === -1;
        });
      }
    });

    return ctData;

  }


  /**
   * Returns an array with the given witness tokens as they are laid out
   * in the collation table, replacing empty references with empty tokens
   *
   * @param {CtDataInterface}ctData
   * @param {number} witnessIndex
   * @return {WitnessTokenInterface[]}
   */
  static getCtWitnessTokens(ctData: CtDataInterface, witnessIndex: number): WitnessTokenInterface[] {
    return ctData.collationMatrix[witnessIndex]
    .map(tokenRef => (tokenRef === -1 || ctData.witnesses[witnessIndex].tokens === undefined) ? {
      tokenType: WitnessTokenType.EMPTY, text: '', tokenClass: '', fmtText: []
    } : ctData.witnesses[witnessIndex].tokens[tokenRef]);
  }

  static getCollationMatrix(ctData: CtDataInterface) {
    let rawCollationMatrix = ctData.collationMatrix;
    let m = new Matrix(rawCollationMatrix.length, rawCollationMatrix.length === 0 ? 0 : rawCollationMatrix[0].length, -1);
    rawCollationMatrix.forEach((row, rowIndex) => {
      row.forEach((ref, colIndex) => {
        m.setValue(rowIndex, colIndex, ref);
      });
    });
    return m;
  }

  static insertColumnsAfter(ctData: CtDataInterface, col: number, numCols: number): CtDataInterface {
    if (numCols <= 0) {
      // nothing to do
      return ctData;
    }
    // 1. insert columns in collation table
    let collationMatrix = this.getCollationMatrix(ctData);
    if (collationMatrix.nRows === 0) {
      return ctData;
    }
    if (col >= collationMatrix.nCols) {
      return ctData;
    }
    let columnSequence = new SequenceWithGroups(collationMatrix.nCols, ctData['groupedColumns']);
    for (let i = 0; i < numCols; i++) {
      collationMatrix.addColumnAfter(col, -1);
      columnSequence.insertNumberAfter(col);
    }
    ctData.collationMatrix = _getRawCollationMatrixFromMatrix(collationMatrix);
    ctData.groupedColumns = columnSequence.getGroupedNumbers();

    if (ctData.type === CollationTableType.EDITION) {
      // 2. insert empty tokens in edition witness
      let editionIndex = ctData.editionWitnessIndex;
      if (ctData.witnesses[editionIndex].tokens === undefined) {
        throw new Error(`Edition witness ${editionIndex} has no tokens`);
      }
      for (let i = 0; i < numCols; i++) {
        ctData.witnesses[editionIndex].tokens.splice(col + 1, 0, {
          tokenClass: 'edition', tokenType: WitnessTokenType.EMPTY, text: "", fmtText: []
        });
      }
      // 3. fix references in collation matrix
      ctData.collationMatrix[editionIndex] = ctData.collationMatrix[editionIndex].map((_ref, i) => {
        return i;
      });

      // 4. fix references in custom apparatuses
      ctData.customApparatuses = this.fixReferencesInCustomApparatusesAfterColumnAdd(ctData, col, numCols);
    }

    return ctData;
  }

  static fixReferencesInCustomApparatusesAfterColumnAdd(ctData: CtDataInterface, col: number, numCols: number): CustomApparatusInterface[] {
    return ctData.customApparatuses.map((app) => {
      let newApp: CustomApparatusInterface = deepCopy(app);
      newApp.entries = app.entries.map((entry) => {
        let newEntry = deepCopy(entry);
        if (entry.from > col) {
          // console.log(`Shifting entry from=${entry.from}, new from = ${entry.from + numCols}`)
        }
        newEntry.from = entry.from > col ? entry.from + numCols : entry.from;
        newEntry.to = entry.to > col ? entry.to + numCols : entry.to;
        return newEntry;
      });
      return newApp;
    });
  }

  /**
   * Updates the custom apparatus indexes after a shift in the edition witness tokens
   */
  static fixReferencesInCustomApparatusesAfterEditionWitnessCellShift(ctData: CtDataInterface, fromCol: number, toCol: number, numCols: number, direction: string): CustomApparatusInterface[] {

    console.log(`Fixing custom apparatus references after cell shift: ${fromCol}-${toCol}, by ${numCols} cols, ${direction}`);
    return ctData.customApparatuses.map((app) => {
      let newApp = deepCopy(app);
      let shift = numCols;
      if (direction === 'left') {
        shift = -shift;
      }
      // make sure fromCol <= toCol
      if (fromCol > toCol) {
        let tmp = fromCol;
        fromCol = toCol;
        toCol = tmp;
      }

      newApp.entries = app.entries.map((entry, i) => {
        let newEntry = deepCopy(entry);
        newEntry.from = entry.from;
        if (entry.from >= fromCol && entry.from <= toCol) {
          newEntry.from = entry.from + shift;
          console.log(`Shifting app. ${app.type} entry ${i} 'from' index: ${entry.from} by ${shift} to ${newEntry.from}`);
        }
        newEntry.to = entry.to;
        if (entry.to >= fromCol && entry.to <= toCol) {
          newEntry.to = entry.to + shift;
          console.log(`Shifting app. ${app.type} entry ${i} 'to' index: ${entry.to} by ${shift} to ${newEntry.to}`);
        }
        return newEntry;
      });
      return newApp;
    });
  }


  static getCustomApparatusEntryIndexFromType(ctData: CtDataInterface, apparatusType: string): number {
    return ctData.customApparatuses.map((app) => {
      return app.type;
    }).indexOf(apparatusType);
  }

  static getCustomApparatusEntryIndexForCtRange(ctData: CtDataInterface, apparatusType: string, ctFrom: number, ctTo: number): number {

    let apparatusIndex = this.getCustomApparatusEntryIndexFromType(ctData, apparatusType);
    if (apparatusIndex === -1) {
      return -1;
    }

    let index = -1;

    ctData.customApparatuses[apparatusIndex].entries.forEach((entry, entryIndex) => {
      // ignore 'section'
      if (entry['from'] === ctFrom && entry['to'] === ctTo) {
        index = entryIndex;
      }
    });
    return index;
  }


  static applyAutomaticNormalizations(ctData: CtDataInterface, normalizerRegister: NormalizerRegister, normalizationsToApply: string[]): CtDataInterface {

    ctData.automaticNormalizationsApplied = normalizationsToApply;

    for (let i = 0; i < ctData.witnesses.length; i++) {
      let witness = ctData.witnesses[i];
      if (witness['witnessType'] !== 'source') {
        ctData.witnesses[i]['tokens'] = this.applyNormalizationsToWitnessTokens(ctData.witnesses[i].tokens, normalizerRegister, normalizationsToApply);
      }
    }
    return ctData;
  }

  static applyNormalizationsToWitnessTokens(tokens: WitnessTokenInterface[], normalizerRegister: NormalizerRegister, normalizationsToApply: string[]) {
    let normalizationsSourcesToOverwrite = [NormalizationSource.AUTOMATIC_COLLATION, NormalizationSource.COLLATION_EDITOR_AUTOMATIC];
    return tokens.map((token) => {
      if (token['tokenType'] === TranscriptionTokenType.WORD) {
        if (normalizationsToApply.length !== 0) {
          // overwrite normalizations with newly calculated ones
          if (token['normalizationSource'] === undefined ||  // no normalization in token
            (token['normalizedText'] === '' && token['normalizationSource'] === '') || // no normalization in token, 2nd possibility
            normalizationsSourcesToOverwrite.indexOf(token['normalizationSource']) !== -1) { // normalization in token is in normalizationSourcesToOverwrite
            let normalizedText = normalizerRegister.applyNormalizerList(normalizationsToApply, token['text']);
            if (normalizedText === token['text']) {
              //no changes
              return token;
            }
            let newToken: WitnessTokenInterface = deepCopy(token);
            newToken.normalizedText = normalizedText;
            newToken.normalizationSource = NormalizationSource.COLLATION_EDITOR_AUTOMATIC;
            return newToken;
          }
          // normalization in token no in normalizationSourcesToOverwrite: no changes
          return token;
        } else {
          // no normalizations to apply
          // => remove automatic normalizations
          let newToken: WitnessTokenInterface = deepCopy(token);
          if (token.normalizedText !== undefined && normalizationsSourcesToOverwrite.indexOf(token.normalizationSource ?? '') !== -1) {
            // => remove automatic normalizations if normalization source in token is in normalizationSourcesToOverwrite
            newToken.normalizedText = undefined;
            newToken.normalizationSource = undefined;
          }
          return newToken;
        }
      } else {
        // non word token, no changes
        return token;
      }
    });
  }

  /**
   * Returns an array with the non-token item indices for each witness in ctData
   */
  static calculateAggregatedNonTokenItemIndexes(ctData: CtDataInterface): NonTokenItemIndex[][] {
    let indexes: NonTokenItemIndex[][] = [];
    for (let witnessIndex = 0; witnessIndex < ctData.witnesses.length; witnessIndex++) {
      let tokenRefs = ctData.collationMatrix[witnessIndex];
      let witness = ctData.witnesses[witnessIndex];
      indexes[witnessIndex] = this.aggregateNonTokenItemIndexes(witness, tokenRefs);
    }
    return indexes;
  }

  static aggregateNonTokenItemIndexes(witnessData: WitnessInterface, tokenRefArray: number[]): NonTokenItemIndex[] {
    if (witnessData.witnessType !== WitnessType.FULL_TX) {
      return [];
    }
    let rawNonTokenItemIndexes = witnessData.nonTokenItemIndexes ?? [];
    let numTokens = witnessData.tokens === undefined ? 0 : witnessData.tokens.length;

    let resultingArray: NonTokenItemIndex[] = [];

    // aggregate post
    let aggregatedPost: number[] = [];
    for (let i = numTokens - 1; i >= 0; i--) {
      let tokenPost: number[] = [];
      if (rawNonTokenItemIndexes[i] !== undefined && rawNonTokenItemIndexes[i]['post'] !== undefined) {
        tokenPost = rawNonTokenItemIndexes[i].post;
      }
      aggregatedPost.push(...tokenPost);
      let tokenIndexRef = tokenRefArray.indexOf(i);
      if (tokenIndexRef !== -1) {
        // token is in the collation table!
        resultingArray[i] = {post: aggregatedPost, pre: []};
        aggregatedPost = [];
      }
    }

    // aggregate pre
    let aggregatedPre: number[] = [];
    for (let i = 0; i < numTokens; i++) {
      let tokenPre: number[] = [];
      if (rawNonTokenItemIndexes[i] !== undefined && rawNonTokenItemIndexes[i].pre !== undefined) {
        tokenPre = rawNonTokenItemIndexes[i].pre;
      }
      aggregatedPre.push(...tokenPre);
      let tokenIndexRef = tokenRefArray.indexOf(i);
      if (tokenIndexRef !== -1) {
        // token is in the collation table!
        resultingArray[i].pre = aggregatedPre;
        aggregatedPre = [];
      }
    }
    return resultingArray;
  }

  static getCtIndexForWitnessTokenIndex(ctData: CtDataInterface, witnessIndex: number, witnessTokenIndex: number): number {
    return ctData.collationMatrix[witnessIndex].indexOf(witnessTokenIndex);
  }

  static getCtIndexForEditionWitnessTokenIndex(ctData: CtDataInterface, editionTokenIndex: number) {
    if (ctData.type !== 'edition') {
      return -1;
    }
    return this.getCtIndexForWitnessTokenIndex(ctData, ctData['editionWitnessIndex'], editionTokenIndex);
  }

}


/**
 *
 * @param {Matrix} m
 * @private
 */
function _getRawCollationMatrixFromMatrix(m: any): any[][] {
  let rawMatrix = [];

  for (let row = 0; row < m.nRows; row++) {
    let theRow = [];
    for (let col = 0; col < m.nCols; col++) {
      theRow.push(m.getValue(row, col));
    }
    rawMatrix.push(theRow);
  }

  return rawMatrix;
}

