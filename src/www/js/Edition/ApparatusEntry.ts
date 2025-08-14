
// noinspection ES6PreferShortImport

import * as SubEntryType from './SubEntryType.js'
import { numericFieldSort } from '../lib/ToolBox/ArrayUtil.js'
import { ApparatusSubEntry } from './ApparatusSubEntry.js'
import { KeyStore } from '../toolbox/KeyStore.mjs'


export class ApparatusEntry {

  section?: number[];
  from: number;
  to: number;
  preLemma: string;
  lemma: string;
  postLemma: string;
  lemmaText: string;
  separator: string;
  tags: string[];
  subEntries: ApparatusSubEntry[];
  metadata: KeyStore;
  /**
   * Only used for a trick in CtData.ts, which needs to be fixed
   * @deprecated
   *
   **/
  toDelete?: boolean;

  constructor () {
    this.from = -1
    this.to = -1
    this.preLemma = ''
    this.lemma = ''
    this.lemmaText = ''
    this.postLemma = ''
    this.separator = ''
    this.tags = []
    /**
     *
     * @type {ApparatusSubEntry[]}
     */
    this.subEntries = []

    /**
     * Extra information that may be added by an edition generator
     * @type {{}}
     */
    this.metadata = new KeyStore()
  }

  static clone(entry: ApparatusEntry): ApparatusEntry {
    let copy = new ApparatusEntry();
    copy.from = entry.from;
    copy.to = entry.to;
    copy.preLemma = entry.preLemma;
    copy.lemma = entry.lemma;
    copy.lemmaText = entry.lemmaText;
    copy.postLemma = entry.postLemma;
    copy.separator = entry.separator;
    copy.tags = [...entry.tags];
    copy.metadata = KeyStore.clone(entry.metadata)
    copy.subEntries = entry.subEntries.map( (subEntry) => {
      return ApparatusSubEntry.clone(subEntry)
    })
    return copy
  }

  /**
   * Order the entry's sub-entries according to their current position
   * values and update those to reflect the new order
   */
  static orderSubEntries(theEntry: ApparatusEntry): ApparatusEntry {
    let entry = ApparatusEntry.clone(theEntry);

    let nonPositionedAutoSubEntries = entry.subEntries
      .filter( (subEntry) => { return subEntry.type === SubEntryType.AUTO && subEntry.position === -1})
    let positionedEntries = numericFieldSort(theEntry.subEntries
      .filter( (subEntry) => { return subEntry.position !== -1}), 'position', true)
    let nonPositionedCustomSubEntries = theEntry.subEntries
      .filter( (subEntry) => { return subEntry.type !== SubEntryType.AUTO && subEntry.position === -1})

    let orderedSubEntries = nonPositionedAutoSubEntries
    orderedSubEntries.push(...positionedEntries);
    orderedSubEntries.push(...nonPositionedCustomSubEntries);
    entry.subEntries = orderedSubEntries.map ( (subEntry,
      index) => {
        subEntry.position = index
        return subEntry
    });
    return entry;
  }

  allSubEntriesAreOmissions(): boolean {
    return ApparatusEntry.allSubEntriesInEntryObjectAreOmissions(this)
  }

  static allSubEntriesInEntryObjectAreOmissions(entry: ApparatusEntry): boolean {
    for (let i = 0; i < entry.subEntries.length; i++) {
      if (entry.subEntries[i].type !== SubEntryType.OMISSION) {
        return false
      }
    }
    return true
  }


}