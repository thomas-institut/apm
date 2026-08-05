// noinspection ES6PreferShortImport

import {
  ChunkInMceData,
  MceDataInterface,
  MceDataInterface_v1,
  MceDataInterface_v2,
  MceDataInterface_v3,
  MceDataInterfaceAny,
  ValidChunkBreaks,
  WitnessInMceData
} from "./MceDataInterface.js";
import * as ArrayUtil from "../lib/ToolBox/ArrayUtil.js";
import {CtDataInterface, SiglaGroupInterface} from "../CtData/CtDataInterface.js";
import {deepCopy} from "../toolbox/Util.js";
import {ValidationError} from "../lib/Error/SystemError.js";
import {StandardizedStringInstanceStatus} from "@/MceData/StandardizedString";


export class MceData {

  static createEmpty(): MceDataInterface {
    return {
      chunks: [],
      chunkOrder: [],
      title: 'New Edition',
      initialSpace: '',
      preamble: [],
      witnesses: [],
      sigla: [],
      siglaGroups: [],
      lang: '',
      stylesheetId: '',
      archived: false,
      schemaVersion: '3',
      includeInAutoMarginalFoliation: [],
      standardizedStrings: []
    };
  }

  static isEmpty(mceData: MceDataInterface): boolean {
    return mceData['chunks'].length === 0;
  }


  static update(mceDataAny: MceDataInterfaceAny): MceDataInterface {
    if (mceDataAny.schemaVersion === '3') {
      return mceDataAny;
    }
    if (mceDataAny.schemaVersion === '2') {
      return this.updateV2toV3(mceDataAny);
    }
    if (mceDataAny.schemaVersion === '1.0') {
      return this.updateV2toV3(this.updateV1toV2(mceDataAny));
    }
    throw new ValidationError(`Unknown schema version: ${(mceDataAny as any).schemaVersion}`);
  }

  static getWorkIds(mceData: MceDataInterface): string[] {
    return mceData.chunks.map(c => c.chunkId.split('-')[0]);
  }

  static addStandardizedString(mceData: MceDataInterface, original: string, standardized: string) {
    if (original === undefined || original.trim() === '') {
      throw new ValidationError(`Invalid original string '${original}'`);
    }
    original = original.trim();
    if (standardized === undefined || standardized.trim() === '') {
      throw new ValidationError(`Invalid standardized string '${standardized}'`);
    }
    standardized = standardized.trim();

    if (original === standardized) {
      throw new ValidationError(`Original and standardized strings cannot be the same`);
    }

    const existing = mceData.standardizedStrings.find(s => s.original === original);
    if (existing) {
      throw new ValidationError(`Standardized string '${original}' already exists`);
    }
    mceData.standardizedStrings.push({original, standardized, instances: []});
    return mceData;
  }

  static deleteStandardizedString(mceData: MceDataInterface, original: string) {
    if (original === undefined || original === '') {
      throw new ValidationError(`Invalid original string '${original}'`);
    }
    mceData.standardizedStrings = mceData.standardizedStrings.filter(s => s.original !== original);
    return mceData;
  }

  static acceptStandardizedStringInstance(mceData: MceDataInterface, str: string, mainTextIndex: number) {
    return this.setStandardizedStringInstance(mceData, str, mainTextIndex, 'accepted');
  }

  static rejectStandardizedStringInstance(mceData: MceDataInterface, str: string, mainTextIndex: number) {
    return this.setStandardizedStringInstance(mceData, str, mainTextIndex, 'rejected');
  }

  static resetStandardizedStringInstance(mceData: MceDataInterface, str: string, mainTextIndex: number) {
    return this.setStandardizedStringInstance(mceData, str, mainTextIndex, 'notReviewed');
  }

  static resetStandardizedStringInstanceAll(mceData: MceDataInterface, str: string) {
    if (str === undefined || str === '') {
      throw new ValidationError(`Invalid string '${str}'`);
    }
    const strIndex = mceData.standardizedStrings.findIndex(s => s.original === str);
    if (strIndex < 0) {
      throw new ValidationError(`String '${str}' not found`);
    }
    mceData.standardizedStrings[strIndex].instances = [];
    return mceData;
  }

  static setTitle(mceData: MceDataInterface, newTitle: string) {
    newTitle = newTitle.trim();
    if (newTitle === '') {
      throw new ValidationError(`Invalid title '${newTitle}'`);
    }
    mceData.title = newTitle;
    return mceData;
  }

  static deleteSiglaGroup(mceData: MceDataInterface, siglaGroupIndex: number): MceDataInterface {
    if (siglaGroupIndex < 0 || siglaGroupIndex >= mceData.siglaGroups.length) {
      throw new ValidationError(`Invalid sigla group index ${siglaGroupIndex}`);
    }
    mceData.siglaGroups.splice(siglaGroupIndex, 1);
    return mceData;
  }

  /**
   *
   * Returns true if the given sigla group is a valid replacement of the existing sigla group at the given index.
   *
   * If the given index is -1, the group is meant to be added to the end of the list.
   *
   * If the group is invalid  returns a string describing the error.
   *
   * @param mceData
   * @param siglaGroupIndex
   * @param group
   */
  static isSiglaGroupValid(mceData: MceDataInterface, siglaGroupIndex: number, group: SiglaGroupInterface): true | string {

    const trimmedSiglum = group.siglum.trim();

    if (siglaGroupIndex >= mceData.siglaGroups.length) {
      return 'Invalid sigla group index';
    }

    if (trimmedSiglum === '') {
      return 'Sigla group must have a non-empty siglum';
    }

    if (group.witnesses.length < 2) {
      return 'Sigla group must have at least two witnesses';
    }

    // check if the witnesses are valid
    if (group.witnesses.some(index => index >= mceData.witnesses.length || index < 0)) {
      return 'Sigla group contains invalid witnesses';
    }

    // check if the group is duplicated
    const otherGroups = mceData.siglaGroups.filter((_g, i) => i !== siglaGroupIndex);

    if (otherGroups.some(g => g.siglum.trim() === trimmedSiglum)) {
      return 'Sigla group siglum is duplicated';
    }

    if (mceData.sigla.some(siglum => siglum.trim() === trimmedSiglum)) {
      return 'Sigla group siglum is a witness siglum';
    }

    if (otherGroups.some(g => g.witnesses.every(s => group.witnesses.includes(s)))) {
      return 'Sigla group is duplicated';
    }

    return true;
  }

  /**
   *
   * @param mceData
   * @param siglaGroupIndex
   * @param group
   * @throws ValidationError
   */
  static changeSiglaGroup(mceData: MceDataInterface, siglaGroupIndex: number, group: SiglaGroupInterface) {
    if (siglaGroupIndex < 0 || siglaGroupIndex >= mceData.siglaGroups.length) {
      throw new ValidationError(`Invalid sigla group index ${siglaGroupIndex}`);
    }
    const isValid = this.isSiglaGroupValid(mceData, siglaGroupIndex, group);
    if (isValid !== true) {
      throw new ValidationError(`Invalid sigla group ${JSON.stringify(group)}: ${isValid}`);
    }

    mceData.siglaGroups[siglaGroupIndex] = deepCopy(group);
    return mceData;
  }

  /**
   *
   * @param mceData
   * @param group
   * @throws ValidationError
   */
  static addSiglaGroup(mceData: MceDataInterface, group: SiglaGroupInterface): MceDataInterface {
    const isValid = this.isSiglaGroupValid(mceData, -1, group);
    if (isValid !== true) {
      throw new ValidationError(`Invalid sigla group ${JSON.stringify(group)}: ${isValid}`);
    }
    mceData.siglaGroups.push(deepCopy(group));
    return mceData;
  }

  /**
   *
   * @param mceData
   * @param chunkIndex
   * @param newBreak
   * @throws ValidationError
   */
  static setChunkBreak(mceData: MceDataInterface, chunkIndex: number, newBreak: string): MceDataInterface {
    if (chunkIndex < 0 || chunkIndex >= mceData.chunks.length) {
      throw new ValidationError(`Invalid chunk index ${chunkIndex}`);
    }

    if (!ValidChunkBreaks.includes(newBreak)) {
      throw new ValidationError(`Invalid chunk break '${newBreak}'`);
    }

    mceData.chunks[chunkIndex].break = newBreak;
    return mceData;
  }

  static isSiglumValid(mceData: MceDataInterface, witnessIndex: number, siglum: string): true | string {
    if (witnessIndex < 0 || witnessIndex >= mceData.witnesses.length) {
      return 'Invalid witness index';
    }

    const trimmedSiglum = siglum.trim();

    if (trimmedSiglum === '') {
      return 'Siglum must have a non-empty value';
    }

    const otherSigla = mceData.sigla.filter((_siglum, index) => index !== witnessIndex);

    if (otherSigla.some(existingSiglum => existingSiglum.trim() === trimmedSiglum)) {
      return 'Siglum is duplicated';
    }

    if (mceData.siglaGroups.some(group => group.siglum.trim() === trimmedSiglum)) {
      return 'Siglum is a sigla group siglum';
    }

    return true;
  }

  /**
   *
   * @param mceData
   * @param witnessIndex
   * @param newSiglum
   * @throws ValidationError
   */
  static setSiglum(mceData: MceDataInterface, witnessIndex: number, newSiglum: string): MceDataInterface {
    const isValid = this.isSiglumValid(mceData, witnessIndex, newSiglum);
    if (isValid !== true) {
      throw new ValidationError(`Invalid siglum '${newSiglum}' for witness index ${witnessIndex}: ${isValid}`);
    }

    mceData.sigla[witnessIndex] = newSiglum.trim();
    return mceData;
  }

  /**
   *
   * @param mceData
   * @param witnessIndex
   * @param newState
   */
  static setAutoMarginalFoliation(mceData: MceDataInterface, witnessIndex: number, newState: boolean): MceDataInterface {
    if (witnessIndex < 0 || witnessIndex >= mceData.witnesses.length) {
      throw new ValidationError(`Invalid witness index ${witnessIndex}`);
    }
    if (mceData.includeInAutoMarginalFoliation === undefined) {
      mceData.includeInAutoMarginalFoliation = [];
    }
    if (newState) {
      if (!mceData.includeInAutoMarginalFoliation.includes(witnessIndex)) {
        mceData.includeInAutoMarginalFoliation.push(witnessIndex);
      }
    } else {
      const index = mceData.includeInAutoMarginalFoliation.indexOf(witnessIndex);
      if (index !== -1) {
        mceData.includeInAutoMarginalFoliation.splice(index, 1);
      }
    }

    return mceData;
  }

  /**
   * Moves a chunk in the chunk order array from the current position to the next position in the specified direction.
   * @param mceData
   * @param chunkPosition
   * @param direction
   */
  static moveChunk(mceData: MceDataInterface, chunkPosition: number, direction: 'forwards' | 'backwards'): MceDataInterface {

    if (chunkPosition === 0 && direction === 'backwards') {
      return mceData;
    }

    if (chunkPosition === mceData.chunkOrder.length - 1 && direction === 'forwards') {
      return mceData;
    }

    const indexOffset = direction === 'backwards' ? -1 : 1;
    mceData.chunkOrder = ArrayUtil.swapElements(mceData.chunkOrder, chunkPosition, chunkPosition + indexOffset);
    return mceData;
  }

  /**
   * Updates a chunk in the MCE data
   *
   * @param mceData
   * @param tableId the system id of the edition
   * @param ctData
   * @param version
   * @param getDocTitle a function to get the title of a document in case the updated chunk adds a new fullTx witness
   * @param getSourceTitle a function to get the title of a source in case the updated chunk adds a new source witness
   */
  static async updateChunk(mceData: MceDataInterface, tableId: number, ctData: CtDataInterface, version: string,
                           getDocTitle: (docId: number) => Promise<string>,
                           getSourceTitle: (sourceId: number) => Promise<string>): Promise<MceDataInterface> {

    const chunkIndex = mceData.chunks.findIndex((chunk) => chunk.chunkEditionTableId === tableId);

    if (chunkIndex === -1) {
      throw new ValidationError(`Chunk with table id ${tableId} which does not exist`);
    }

    if (ctData.type !== 'edition') {
      throw new ValidationError(`Table id ${tableId} used to update a chunk is not an edition`);
    }

    if (ctData.lang !== mceData.lang) {
      // this should never happen, but if it does, it will break a lot of things, so let's throw an error right away
      throw new ValidationError(`Table id ${tableId} is not in the same language as the multi-chunk edition: '${ctData.lang}' (must be '${mceData.lang}')`);
    }

    if (ctData.archived) {
      console.warn(`Updating chunk with archived table id ${tableId}`);
    }

    mceData.chunks[chunkIndex].version = version;
    mceData.chunks[chunkIndex].title = ctData.title;

    const chunk = mceData.chunks[chunkIndex];
    chunk.witnessIndices = [];

    for (let ctDataWitnessIndex = 0; ctDataWitnessIndex < ctData.witnesses.length; ctDataWitnessIndex++) {
      let ctDataWitnessInfo = ctData.witnesses[ctDataWitnessIndex];
      if (ctDataWitnessInfo.witnessType === 'edition') {
        chunk.witnessIndices.push(-1);
        continue;
      }

      switch (ctDataWitnessInfo.witnessType) {
        case 'fullTx': {
          if (ctDataWitnessInfo.docId === undefined) {
            console.warn(`Full TX witness info does not have docId, this should never happen!`, ctDataWitnessInfo);
            break;
          }
          const localWitnessId = ctDataWitnessInfo.localWitnessId ?? 'A';
          const witnessId = `${ctDataWitnessInfo.witnessType}-${ctDataWitnessInfo.docId}-${localWitnessId}`;
          const witnessIndex = this.getWitnessIndexByWitnessId(mceData, witnessId);
          if (witnessIndex === -1) {
            const siglum = ctData.sigla[ctDataWitnessIndex] ?? `W${mceData.witnesses.length}`;
            const title = await getDocTitle(ctDataWitnessInfo.docId);
            const newWitnessIndex = this.addNewWitnessInfo(mceData, {
              type: 'fullTx',
              witnessId: witnessId,
              docId: ctDataWitnessInfo.docId,
              localWitnessId: localWitnessId,
              title: title
            }, siglum);
            chunk.witnessIndices.push(newWitnessIndex);
          } else {
            chunk.witnessIndices.push(witnessIndex);
          }
          break;
        }

        case 'source': {
          const witnessId = ctDataWitnessInfo.ApmWitnessId;
          const witnessIndex = this.getWitnessIndexByWitnessId(mceData, witnessId);
          if (witnessIndex === -1) {
            let [, tidStr] = witnessId.split(':');
            const tid = parseInt(tidStr);
            const title = await getSourceTitle(tid);
            const siglum = ctData.sigla[ctDataWitnessIndex] ?? `W${mceData.witnesses.length}`;
            const newWitnessIndex = this.addNewWitnessInfo(mceData, {
              type: 'source',
              witnessId: witnessId,
              tid: tid,
              title: title
            }, siglum);
            chunk.witnessIndices.push(newWitnessIndex);
          } else {
            chunk.witnessIndices.push(witnessIndex);
          }
          break;
        }

        default:
          console.warn(`Unknown witness type '${ctDataWitnessInfo['witnessType']}' found in ctData, witness index ${ctDataWitnessIndex}`);
          console.log(ctData);
      }
    }

    return this.removeUnusedWitnessesAndReindex(mceData);
  }

  static deleteChunk(mceData: MceDataInterface, chunkIndex: number): MceDataInterface {
    if (mceData.chunks.length === 0) {
      console.warn(`Attempt to delete chunks from empty edition`);
      return mceData;
    }

    if (chunkIndex >= mceData.chunks.length || chunkIndex < 0) {
      throw new ValidationError(`Chunk delete on out of range index ${chunkIndex}`);
    }

    if (mceData.chunks.length === 1) {
      // deleting the only chunk
      mceData.chunks = [];
      mceData.witnesses = [];
      mceData.sigla = [];
      mceData.siglaGroups = [];
      mceData.chunkOrder = [];
      mceData.includeInAutoMarginalFoliation = [];
      return mceData;
    }

    console.log(`Deleting chunk ${chunkIndex}`);
    mceData.chunks.splice(chunkIndex, 1);
    mceData.chunkOrder = mceData.chunkOrder.map((index) => {
      if (index === chunkIndex) {
        return -1;
      }
      if (index > chunkIndex) {
        return index - 1;
      }
      return index;
    }).filter((index) => {
      return index !== -1;
    });

    return this.removeUnusedWitnessesAndReindex(mceData);
  }

  static async addChunk(mceData: MceDataInterface, tableId: number,
                        ctData: CtDataInterface, chunkTimeString: string,
                        getDocTitle: (docId: number) => Promise<string>,
                        getSourceTitle: (sourceId: number) => Promise<string>
  ): Promise<MceDataInterface> {
    console.log(`Adding chunk ${ctData.chunkId} to MceData`);
    // first, see if the exact chunk edition is already in
    for (let chunkIndex = 0; chunkIndex < mceData.chunks.length; chunkIndex++) {
      const chunk = mceData.chunks[chunkIndex];
      if (chunk.chunkEditionTableId === tableId) {
        throw new ValidationError(`Table ${tableId} already included`);
      }
    }
    // new chunk, check if it's the same language
    if (mceData.chunks.length !== 0 && mceData.lang !== ctData.lang) {
      throw new ValidationError(`Table id ${tableId} is not in the same language as the multi-chunk edition: '${ctData.lang}' (must be '${mceData.lang}')`);
    }

    if (ctData.type !== 'edition') {
      // reject non-editions
      throw new ValidationError(`Table id ${tableId} used to add a chunk is not an edition`);
    }

    if (mceData.chunks.length === 0) {
      // the first chunk in the edition
      mceData.lang = ctData.lang;
    }

    const newChunk: ChunkInMceData = {
      chunkId: ctData.chunkId,
      chunkEditionTableId: tableId,
      version: chunkTimeString,
      break: 'paragraph',
      lineNumbersRestart: false,
      witnessIndices: [],
      title: ctData.title
    };

    mceData.chunks.push(newChunk);
    mceData.chunkOrder.push(mceData.chunks.length - 1);

    // add new witnesses and sigla
    for (let ctDataWitnessIndex = 0; ctDataWitnessIndex < ctData.witnesses.length; ctDataWitnessIndex++) {
      let ctDataWitnessInfo = ctData.witnesses[ctDataWitnessIndex];

      switch (ctDataWitnessInfo.witnessType) {
        case 'edition':
          newChunk.witnessIndices.push(-1);
          break;

        case 'fullTx': {
          if (ctDataWitnessInfo.docId === undefined) {
            console.warn(`Full TX witness info does not have docId, this should never happen!`, ctDataWitnessInfo);
            break;
          }
          const witnessId = `${ctDataWitnessInfo.witnessType}-${ctDataWitnessInfo.docId}-${ctDataWitnessInfo.localWitnessId}`;
          const witnessIndex = this.getWitnessIndexByWitnessId(mceData, witnessId);
          if (witnessIndex === -1) {
            // new witness
            const title = await getDocTitle(ctDataWitnessInfo.docId);
            let newWitnessSiglum = ctData.sigla[ctDataWitnessIndex];
            let newWitnessIndex = this.addNewWitnessInfo(mceData, {
              type: 'fullTx',
              witnessId: witnessId,
              docId: ctDataWitnessInfo.docId,
              localWitnessId: ctDataWitnessInfo.localWitnessId ?? 'A',
              title: title
            }, newWitnessSiglum);
            newChunk.witnessIndices.push(newWitnessIndex);
          } else {
            // witness already exists
            newChunk.witnessIndices.push(witnessIndex);
          }
          break;
        }

        case 'source': {
          const witnessId = ctDataWitnessInfo.ApmWitnessId;
          const witnessIndex = this.getWitnessIndexByWitnessId(mceData, witnessId);
          if (witnessIndex === -1) {
            // new witness
            let [, tidStr] = witnessId.split(':');
            const tid = parseInt(tidStr);
            let title = await getSourceTitle(tid);
            let newWitnessSiglum = ctData.sigla[ctDataWitnessIndex];
            let newWitnessIndex = this.addNewWitnessInfo(mceData, {
              type: 'source', witnessId: witnessId, tid: tid, title: title
            }, newWitnessSiglum);
            newChunk.witnessIndices.push(newWitnessIndex);
          } else {
            // witness already exists
            newChunk.witnessIndices.push(witnessIndex);
          }
          break;
        }

        default:
          console.warn(`Unknown witness type '${ctDataWitnessInfo['witnessType']}' found in ctData, witness index ${ctDataWitnessIndex}`);
          console.log(ctData);
      }
    }
    return mceData;
  }

  private static updateV1toV2(mceDataV1: MceDataInterface_v1): MceDataInterface_v2 {

    const newMceData: MceDataInterface_v2 = {
      ...mceDataV1,
      schemaVersion: '2',
      chunkOrder: [],
      includeInAutoMarginalFoliation: []
    };
    if (mceDataV1.chunkOrder === undefined) {
      newMceData.chunkOrder = mceDataV1.chunks.map((_c, i) => i);
    } else {
      newMceData.chunkOrder = mceDataV1.chunkOrder;
    }
    if (mceDataV1.includeInAutoMarginalFoliation === undefined) {
      newMceData.includeInAutoMarginalFoliation = [];
    } else {
      newMceData.includeInAutoMarginalFoliation = mceDataV1.includeInAutoMarginalFoliation;
    }
    return newMceData;
  }

  private static updateV2toV3(mceDataV2: MceDataInterface_v2): MceDataInterface_v3 {
    return {...mceDataV2, schemaVersion: '3', standardizedStrings: []};
  }

  private static setStandardizedStringInstance(mceData: MceDataInterface, str: string, mainTextIndex: number, status: StandardizedStringInstanceStatus) {
    if (str === undefined || str === '') {
      throw new ValidationError(`Invalid string '${str}'`);
    }
    const strIndex = mceData.standardizedStrings.findIndex(s => s.original === str);
    if (strIndex < 0) {
      throw new ValidationError(`String '${str}' not found`);
    }
    const instanceIndex = mceData.standardizedStrings[strIndex].instances.findIndex(i => i.mainTextIndex === mainTextIndex);
    if (status === 'notReviewed') {
      if (instanceIndex >= 0) {
        // remove the instance
        mceData.standardizedStrings[strIndex].instances.splice(instanceIndex, 1);
      }
      return mceData;
    }
    if (instanceIndex < 0) {
      mceData.standardizedStrings[strIndex].instances.push({mainTextIndex: mainTextIndex, status: status});
    } else {
      mceData.standardizedStrings[strIndex].instances[instanceIndex].status = status;
    }
    return mceData;
  }

  /**
   * Returns the index of the witness with the given `witnessId`, or `-1` when it is not present.
   */
  private static getWitnessIndexByWitnessId(mceData: MceDataInterface, witnessId: string): number {
    for (let i = 0; i < mceData.witnesses.length; i++) {
      if (witnessId === mceData.witnesses[i].witnessId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Appends a new witness and its siglum, ensuring the stored siglum is unique inside `mceData.sigla`.
   *
   * When the requested siglum already exists, a fallback siglum (`W{index}`) is generated.
   *
   * @returns The index assigned to the newly added witness.
   */
  private static addNewWitnessInfo(mceData: MceDataInterface, witnessInfo: WitnessInMceData, siglum: string): number {
    mceData.witnesses.push(witnessInfo);
    let witnessIndex = mceData.witnesses.length - 1;
    // add witness siglum at the end of this.mceData.sigla
    if (mceData.sigla.indexOf(siglum) !== -1) {
      // siglum already exists; since we don't want duplicate sigla,
      // we need to create a new unique one that the user will surely
      // change later on
      mceData.sigla.push(`W${witnessIndex}`);
    } else {
      // just push it
      mceData.sigla.push(siglum);
    }
    return witnessIndex;
  }

  /**
   * Removes witnesses that are no longer referenced by any chunk and re-indexes all witness references.
   *
   * This updates `chunks[].witnessIndices`, `siglaGroups[].witnesses`, and
   * `includeInAutoMarginalFoliation` (when defined) to match the compacted witness list.
   */
  private static removeUnusedWitnessesAndReindex(mceData: MceDataInterface): MceDataInterface {
    const usedWitnessIndices = new Set<number>();
    mceData.chunks.forEach(chunk => {
      chunk.witnessIndices.forEach(idx => {
        if (idx !== -1) {
          usedWitnessIndices.add(idx);
        }
      });
    });

    const oldWitnesses = [...mceData.witnesses];
    const oldSigla = [...mceData.sigla];
    mceData.witnesses = [];
    mceData.sigla = [];

    const oldToNewIndexMap = new Map<number, number>();
    oldWitnesses.forEach((witness, oldIndex) => {
      if (usedWitnessIndices.has(oldIndex)) {
        mceData.witnesses.push(witness);
        mceData.sigla.push(oldSigla[oldIndex]);
        oldToNewIndexMap.set(oldIndex, mceData.witnesses.length - 1);
      }
    });

    mceData.chunks.forEach(chunk => {
      chunk.witnessIndices = chunk.witnessIndices.map(oldIndex => {
        if (oldIndex === -1) {
          return -1;
        }
        return oldToNewIndexMap.get(oldIndex) ?? -1;
      });
    });

    mceData.siglaGroups.forEach(group => {
      group.witnesses = group.witnesses
        .map(oldIndex => oldToNewIndexMap.get(oldIndex))
        .filter(newIndex => newIndex !== undefined) as number[];
    });

    if (mceData.includeInAutoMarginalFoliation !== undefined) {
      mceData.includeInAutoMarginalFoliation = mceData.includeInAutoMarginalFoliation
        .map(oldIndex => oldToNewIndexMap.get(oldIndex))
        .filter(newIndex => newIndex !== undefined) as number[];
    }

    return mceData;
  }

}

