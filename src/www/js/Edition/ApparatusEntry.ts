// noinspection ES6PreferShortImport

import * as SubEntryType from './SubEntryType.js';
import {numericFieldSort} from '../lib/ToolBox/ArrayUtil.js';
import {ApparatusSubEntry} from './ApparatusSubEntry.js';
import {ApparatusEntryInterface, cloneMetadata, MetadataInterface} from "./EditionInterface.js";
import {FmtTextToken} from "../lib/FmtText/FmtTextToken.js";


export class ApparatusEntry implements ApparatusEntryInterface {

  section?: number[];
  from: number;
  to: number;
  preLemma: string;
  lemma: string | FmtTextToken[];
  postLemma: string;
  lemmaText: string;
  separator: string;
  tags: string[];
  subEntries: ApparatusSubEntry[];
  metadata: MetadataInterface;

  constructor() {
    this.from = -1;
    this.to = -1;
    this.preLemma = '';
    this.lemma = '';
    this.lemmaText = '';
    this.postLemma = '';
    this.separator = '';
    this.tags = [];
    this.subEntries = [];
    this.metadata = {};
  }

  static clone(entry: ApparatusEntryInterface): ApparatusEntry {
    return new ApparatusEntry().setFromInterface(entry);
  }

  /**
   * Order the entry's sub-entries according to their current position
   * values and update those to reflect the new order
   */
  static orderSubEntries(theEntry: ApparatusEntry): ApparatusEntry {
    let entry = ApparatusEntry.clone(theEntry);

    let nonPositionedAutoSubEntries = entry.subEntries
    .filter((subEntry) => {
      return subEntry.type === SubEntryType.AUTO && subEntry.position === -1;
    });
    let positionedEntries = numericFieldSort(theEntry.subEntries
    .filter((subEntry) => {
      return subEntry.position !== -1;
    }), 'position', true);
    let nonPositionedCustomSubEntries = theEntry.subEntries
    .filter((subEntry) => {
      return subEntry.type !== SubEntryType.AUTO && subEntry.position === -1;
    });

    let orderedSubEntries = nonPositionedAutoSubEntries;
    orderedSubEntries.push(...positionedEntries);
    orderedSubEntries.push(...nonPositionedCustomSubEntries);
    entry.subEntries = orderedSubEntries.map((subEntry, index) => {
      subEntry.position = index;
      return subEntry;
    });
    return entry;
  }

  static allSubEntriesInEntryObjectAreOmissions(entry: ApparatusEntry): boolean {
    for (let i = 0; i < entry.subEntries.length; i++) {
      if (entry.subEntries[i].type !== SubEntryType.OMISSION) {
        return false;
      }
    }
    return true;
  }

  setFromInterface(entry: ApparatusEntryInterface): this {
    this.from = entry.from;
    this.to = entry.to;
    this.preLemma = entry.preLemma;
    this.lemma = entry.lemma;
    this.lemmaText = entry.lemmaText;
    this.postLemma = entry.postLemma;
    this.separator = entry.separator;
    this.tags = [...entry.tags];
    this.metadata = cloneMetadata(entry.metadata);
    this.subEntries = entry.subEntries.map((subEntry) => {
      return ApparatusSubEntry.clone(subEntry);
    });
    return this;
  }

  allSubEntriesAreOmissions(): boolean {
    return ApparatusEntry.allSubEntriesInEntryObjectAreOmissions(this);
  }


}