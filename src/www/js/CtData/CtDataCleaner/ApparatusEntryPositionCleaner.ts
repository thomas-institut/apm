import {CtDataCleaner} from './CtDataCleaner';
import {CtDataInterface, WitnessTokenInterface} from "../CtDataInterface";


export class ApparatusEntryPositionCleaner extends CtDataCleaner {

  /**
   * Fixes a problem in apparatus entries where one of the end points of
   * the entry refers to a column with no printable token
   * @return {*}
   * @param ctData
   */
  getCleanCtData(ctData: CtDataInterface): CtDataInterface {
    if (ctData.customApparatuses === undefined) {
      // not apparatuses to fix!
      return ctData;
    }
    const EntryToBeDeleted = -1234; // assigning this value to the 'from' index signals that the entry should be deleted
    this.verbose && console.log(`Checking consistency in entry positions`);
    let errorsFound = false;
    let errorsNotFixed = false;
    let editionWitnessIndex = ctData.editionWitnessIndex;
    let editionWitnessTokens = ctData.witnesses[editionWitnessIndex].tokens;
    ctData.customApparatuses = ctData.customApparatuses.map((app) => {
      app.entries = app.entries.map((entry, entryIndex) => {
        let singleColumnEntry = false;
        if (entry.from === entry.to) {
          singleColumnEntry = true;
        }
        let fromToken = editionWitnessTokens[entry.from];
        let toToken = editionWitnessTokens[entry.to];
        if (fromToken === undefined) {
          errorsFound = true;
          entry.from = EntryToBeDeleted;
          console.warn(`Apparatus ${app.type}: entry ${entryIndex} with 'from' index ${entry.from} refers to undefined token, entry will be deleted`);
        } else {
          if (fromToken.tokenType !== 'word' && fromToken.tokenType !== 'punctuation') {
            errorsFound = true;
            // fix it by looking at the closest word or punctuation token before the toToken
            console.warn(`Apparatus ${app.type}: entry ${entryIndex} with 'from' index ${entry.from} refers to non-printable token (${fromToken.tokenType})`);
            let newIndex =-1;
            if (singleColumnEntry) {
              // can't really solve this issue, so just delete the entry
              entry.from = EntryToBeDeleted;
            } else {
              newIndex = this.findPrintableIndex(editionWitnessTokens, entry.from, entry.to, true);
            }
            if (newIndex === -1) {
              console.warn(`Could not fix the problem, entry will be deleted`);
              errorsNotFixed = true;
              entry.from = EntryToBeDeleted;
            } else {
              console.log(`Problem fixed, new 'from' index is ${newIndex}`);
              entry.from = newIndex;
            }
          }
        }
        if (singleColumnEntry) {
          // no need to repeat the check for the 'to' token
          entry.to = entry.from;
        } else {
          if (toToken === undefined) {
            errorsFound = true;
            entry.from = EntryToBeDeleted;
            console.warn(`Apparatus ${app.type}: entry ${entryIndex} with 'to' index ${entry.to} refers to undefined token, entry will be deleted`);
          } else {
            if (toToken.tokenType !== 'word' && toToken.tokenType !== 'punctuation') {
              errorsFound = true;
              // fix it by looking at the closest word or punctuation token before the toToken
              console.warn(`Apparatus ${app.type}: entry ${entryIndex} with 'to' index ${entry.to} refers to non-printable token (${toToken.tokenType})`);
              let newIndex = this.findPrintableIndex(editionWitnessTokens, entry.from, entry.to, false);
              if (newIndex === -1) {
                errorsNotFixed = true;
                console.warn(`Could not fix the problem`);
              } else {
                console.log(`Problem fixed, new 'to' index is ${newIndex}`);
                entry.to = newIndex;
              }
            }
          }
        }
        return entry;
      }).filter(entry => entry.from !== EntryToBeDeleted);
      return app;
    });
    if (errorsFound) {
      if (errorsNotFixed) {
        console.warn(`Some errors could not be fixed`);
      } else {
        this.verbose && console.log(`...all good, all problems fixed`);
      }
    } else {
      this.verbose && console.log(`...all good`);
    }
    return ctData;
  }

  /**
   *
   * @param tokens
   * @param {number}from
   * @param {number}to
   * @param {boolean}forward
   * @private
   */
  findPrintableIndex(tokens: WitnessTokenInterface[], from: number, to: number, forward: boolean) {

    let index = forward ? from : to;
    let limit = forward ? to : from;  // add/subtract 1 so that the limit itself is included in the loop


    while (index !== limit) {
      if (tokens[index].tokenType === 'word' || tokens[index].tokenType === 'punctuation') {
        return index;
      }
      if (forward) {
        index++;
        if (index > limit) {
          break;
        }
      } else {
        index--;
        if (index < limit) {
          break;
        }
      }
    }
    return -1;
  }
}