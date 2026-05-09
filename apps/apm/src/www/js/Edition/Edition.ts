// noinspection ES6PreferShortImport

import {MainTextToken} from './MainTextToken.js';
import {EditionWitnessInfo} from "./EditionWitnessInfo.js";
import {SiglaGroup} from "./SiglaGroup.js";
import {FoliationChangeInfoInterface} from "./FoliationChangeInfoInterface.js";
import {EditionInfoInterface, EditionInterface, MetadataInterface} from "./EditionInterface.js";
import {Apparatus} from "./Apparatus.js";

export class Edition implements EditionInterface {
  lang: string = '';
  info: EditionInfoInterface = {
    baseWitnessIndex: -1, chunkId: "", editionId: -1, singleChunk: true, source: "", tableId: -1
  };
  mainText: MainTextToken[] = [];
  apparatuses: Apparatus[] = [];
  witnesses: EditionWitnessInfo[] = [];
  siglaGroups: SiglaGroup[] = [];
  foliationChanges: FoliationChangeInfoInterface[] | null = null;
  metadata: MetadataInterface = {};

  setMainText(mainText: MainTextToken[]): this {
    this.mainText = mainText;
    return this;
  }

  setLang(lang: string): this {
    this.lang = lang;
    return this;
  }

  getLang(): string {
    return this.lang;
  }

  getSigla(): string[] {
    return this.witnesses.map(w => w.siglum);
  }

  /**
   *
   * @param {number}from
   * @param {number}to
   * @return {string}
   */
  getPlainTextForRange(from: number, to: number): string {
    if (to < 0 || from > to) {
      return '';
    }
    if (from < 0) {
      from = 0;
    }
    return this.mainText.filter((_token, i) => {
      return i >= from && i <= to;
    }).map((token) => {
      return token.getPlainText();
    }).join('');
  }

  /**
   * Loads the edition data from the given interface.
   *
   * Data from the given interface will be copied/cloned into the edition data structure.
   * @param editionData
   */
  setFromInterface(editionData: EditionInterface): this {
    this.lang = editionData.lang;
    this.mainText = editionData.mainText.map(t => new MainTextToken().setFromInterface(t));
    this.apparatuses = editionData.apparatuses.map(a => new Apparatus().setFromInterface(a));
    this.witnesses = editionData.witnesses.map(w => new EditionWitnessInfo().setFromInterface(w));
    this.siglaGroups = editionData.siglaGroups.map(sg => new SiglaGroup().setFromInterface(sg));
    if (editionData.foliationChanges === null) {
      this.foliationChanges = null;
    } else {
      this.foliationChanges = JSON.parse(JSON.stringify(editionData.foliationChanges));
    }
    this.metadata = JSON.parse(JSON.stringify(editionData.metadata));
    return this;
  }

}
