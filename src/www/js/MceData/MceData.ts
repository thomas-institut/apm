import {MceDataInterface} from "@/MceData/MceDataInterface";


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

}