import {ChunkInMceData, MceDataInterface, ValidChunkBreaks, WitnessInMceData} from "./MceDataInterface.js";
import * as ArrayUtil from "../lib/ToolBox/ArrayUtil.js";
import {CtDataInterface, SiglaGroupInterface} from "@/CtData/CtDataInterface";
import {deepCopy} from "@/toolbox/Util";


export class MceData {

  /**
   *
   * @return {MceDataInterface}
   */
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
      schemaVersion: '1.0',
      includeInAutoMarginalFoliation: []
    };
  }

  /**
   *
   * @param {MceDataInterface}mceData
   * @return {boolean}
   */
  static isEmpty(mceData: MceDataInterface): boolean {
    return mceData['chunks'].length === 0;
  }

  /**
   *
   * @param {MceDataInterface}mceData
   * @return {MceDataInterface}
   */
  static fix(mceData: MceDataInterface): MceDataInterface {
    if (mceData.chunkOrder === undefined) {
      mceData.chunkOrder = this.getDefaultChunkOrder(mceData);
    }
    if (mceData.includeInAutoMarginalFoliation === undefined) {
      mceData.includeInAutoMarginalFoliation = [];
    }
    return mceData;
  }

  static getDefaultChunkOrder(mceData: MceDataInterface) {
    return mceData.chunks.map((_c, i) => i);
  }

  static setTitle(mceData: MceDataInterface, newTitle: string) {
    newTitle = newTitle.trim();
    if (newTitle === '') {
      console.warn(`Invalid title '${newTitle}'`);
      return mceData;
    }
    mceData.title = newTitle;
    return mceData;
  }

  static deleteSiglaGroup(mceData: MceDataInterface, siglaGroupIndex: number): MceDataInterface {
    if (siglaGroupIndex < 0 || siglaGroupIndex >= mceData.siglaGroups.length) {
      throw (`Invalid sigla group index ${siglaGroupIndex}`);
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
    const otherGroups = mceData.siglaGroups.filter((g, i) => i !== siglaGroupIndex);

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

  static changeSiglaGroup(mceData: MceDataInterface, siglaGroupIndex: number, group: SiglaGroupInterface) {
    if (siglaGroupIndex < 0 || siglaGroupIndex >= mceData.siglaGroups.length) {
      throw (`Invalid sigla group index ${siglaGroupIndex}`);
    }
    const isValid = this.isSiglaGroupValid(mceData, siglaGroupIndex, group);
    if (isValid !== true) {
      throw (`Invalid sigla group ${JSON.stringify(group)}: ${isValid}`);
    }

    mceData.siglaGroups[siglaGroupIndex] = deepCopy(group);
    return mceData;
  }

  static addSiglaGroup(mceData: MceDataInterface, group: SiglaGroupInterface): MceDataInterface {
    const isValid = this.isSiglaGroupValid(mceData, -1, group);
    if (isValid !== true) {
      throw (`Invalid sigla group ${JSON.stringify(group)}: ${isValid}`);
    }
    mceData.siglaGroups.push(deepCopy(group));
    return mceData;
  }

  static setChunkBreak(mceData: MceDataInterface, chunkIndex: number, newBreak: string): MceDataInterface {
    if (chunkIndex < 0 || chunkIndex >= mceData.chunks.length) {
      console.warn(`Invalid chunk index ${chunkIndex}`);
      return mceData;
    }

    if (!ValidChunkBreaks.includes(newBreak)) {
      console.warn(`Invalid chunk break '${newBreak}'`);
      return mceData;
    }

    mceData.chunks[chunkIndex].break = newBreak;
    return mceData;
  }

  static setSiglum(mceData: MceDataInterface, witnessIndex: number, newSiglum: string): MceDataInterface {
    if (witnessIndex < 0 || witnessIndex >= mceData.witnesses.length) {
      console.warn(`Invalid witness index ${witnessIndex}`);
      return mceData;
    }
    newSiglum = newSiglum.trim();
    if (newSiglum === '') {
      console.warn(`Invalid siglum '${newSiglum}'`);
      return mceData;
    }
    mceData.sigla[witnessIndex] = newSiglum;
    return mceData;
  }

  static setAutoMarginalFoliation(mceData: MceDataInterface, witnessIndex: number, newState: boolean): MceDataInterface {
    if (witnessIndex < 0 || witnessIndex >= mceData.witnesses.length) {
      console.warn(`Invalid witness index ${witnessIndex}`);
      return mceData;
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

    if (mceData.chunkOrder === undefined) {
      mceData.chunkOrder = this.getDefaultChunkOrder(mceData);
    }
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
      throw new Error(`Attempt to update chunk with id ${tableId} which does not exist`);
    }

    if (ctData.type !== 'edition') {
      throw new Error(`Attempt to update chunk with id ${tableId} which is not an edition`);
    }

    if (ctData.lang !== mceData.lang) {
      // this should never happen, but if it does, it will break a lot of things, so let's throw an error right away
      throw new Error(`Attempt to update chunk with id ${tableId} which is not in the same language`);
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
      console.warn(`Chunk delete on out of range index ${chunkIndex}`);
      return mceData;
    }

    if (mceData.chunks.length === 1) {
      // deleting the only chunk
      mceData.chunks = [];
      mceData.witnesses = [];
      mceData.sigla = [];
      mceData.siglaGroups = [];
      return mceData;
    }
    if (mceData.chunkOrder === undefined) {
      mceData.chunkOrder = MceData.getDefaultChunkOrder(mceData);
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
      if (chunk.chunkEditionTableId === tableId && chunk.version === chunkTimeString) {
        console.warn(`Table ${tableId} already included`);
        return mceData;
      }
    }
    // new chunk, check if it's the same language
    if (mceData.chunks.length !== 0 && mceData.lang !== ctData['lang']) {
      throw new Error(`Attempt to add chunk with id ${tableId} which is not in the same language`);
    }

    if (ctData.type !== 'edition') {
      // reject non-editions
      throw new Error(`Attempt to update chunk with id ${tableId} which is not an edition`);
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
    // add it to the end of the list
    if (mceData.chunkOrder === undefined) {
      mceData.chunkOrder = MceData.getDefaultChunkOrder(mceData);
    }
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
   * Removes witnesses that are no longer referenced by any chunk and reindexes all witness references.
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

