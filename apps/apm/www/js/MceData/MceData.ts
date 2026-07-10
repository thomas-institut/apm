import {ChunkInMceData, MceDataInterface, WitnessInMceData} from "./MceDataInterface.js";
import * as ArrayUtil from "../lib/ToolBox/ArrayUtil.js";
import {CtDataInterface} from "@/CtData/CtDataInterface";

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

  /**
   * Moves a chunk in the chunk order array from the current position to the next position in the specified direction.
   * @param mceData
   * @param chunkPosition
   * @param direction
   */
  static moveChunk(mceData: MceDataInterface, chunkPosition: number, direction: 'forwards' | 'backwards') {

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
    console.log(`Deleting chunk ${chunkIndex}`);
    mceData.chunks.splice(chunkIndex, 1);
    if (mceData.chunkOrder === undefined) {
      mceData.chunkOrder = MceData.getDefaultChunkOrder(mceData);
    }
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

    // TODO: handle witnesses and sigla
    // Check all the witnesses in mceData.witnesses to see if they're still used in at least one chunk 
    // if not, remove that witness from mceData.witnesses and the corresponding siglum in mceData.sigla, and
    // make sure the witness indices in every chunk (mceData.chunks[i].witnessIndices) point to the correct witnesses
    //
    const removeWitness = (witnessIndex: number) => {
      mceData.witnesses.splice(witnessIndex, 1);
      mceData.sigla.splice(witnessIndex, 1);
      // TODO: update witness indices in chunks
    }

    return mceData;
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
      console.warn(`Wrong language (${ctData.lang})`);
      return mceData;
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
    // add it to the end of the list
    if (mceData.chunkOrder === undefined) {
      mceData.chunkOrder = MceData.getDefaultChunkOrder(mceData);
    }
    mceData.chunkOrder.push(mceData.chunks.length - 1);

    const addNewWitnessInfo = (witnessInfo: WitnessInMceData, siglum: string): number => {
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
    };

    /**
     * Returns the index of the witness with the given witnessId in `mceData.witnesses`, or -1 if it doesn't exist
     * @param witnessId
     */
  const getWitnessIndexByWitnessId = (witnessId: string): number => {
      for (let i = 0; i < mceData.witnesses.length; i++) {
        if (witnessId === mceData.witnesses[i].witnessId) {
          return i;
        }
      }
      return -1;
    }

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
          const witnessIndex = getWitnessIndexByWitnessId(witnessId);
          if (witnessIndex === -1) {
            // new witness
            const title = await getDocTitle(ctDataWitnessInfo.docId);
            let newWitnessSiglum = ctData.sigla[ctDataWitnessIndex];
            let newWitnessIndex = addNewWitnessInfo({
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
          const witnessIndex = getWitnessIndexByWitnessId(witnessId);
          if (witnessIndex === -1) {
            // new witness
            let [, tidStr] = witnessId.split(':');
            const tid = parseInt(tidStr);
            let title = await getSourceTitle(tid);
            let newWitnessSiglum = ctData.sigla[ctDataWitnessIndex];
            let newWitnessIndex = addNewWitnessInfo({
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


}

